import { Box, CircularProgress, SpeedDialActionProps } from "@mui/material";
import { BoundingSphere } from "@novorender/webgl-api";
import { vec3 } from "gl-matrix";
import { useEffect, useRef } from "react";

import { useAppDispatch } from "app/store";
import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useHighlighted } from "contexts/highlighted";
import { imagesActions } from "features/images";
import { CameraType, renderActions } from "features/render/renderSlice";
import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { objIdsToTotalBoundingSphere } from "utils/objectData";

enum Status {
    Initial,
    Loading,
}

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
};

export function FlyToSelected({ position, ...speedDialProps }: Props) {
    const { name, Icon } = featuresConfig.flyToSelected;
    const highlighted = useHighlighted().idArr;
    const {
        state: { db, scene },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();

    const [status, setStatus] = useMountedState(Status.Initial);

    const previousBoundingSphere = useRef<BoundingSphere>();
    const [abortController, abort] = useAbortController();

    useEffect(() => {
        previousBoundingSphere.current = undefined;
        abort();
        setStatus(Status.Initial);
    }, [highlighted, abort, setStatus]);

    const handleClick = async () => {
        if (!highlighted.length) {
            return;
        }

        if (previousBoundingSphere.current) {
            dispatch(renderActions.setCamera({ type: CameraType.Pinhole, zoomTo: previousBoundingSphere.current }));
            dispatch(imagesActions.setActiveImage(undefined));
            return;
        }

        setStatus(Status.Loading);

        const abortSignal = abortController.current.signal;
        try {
            const boundingSphere = await objIdsToTotalBoundingSphere({
                ids: highlighted,
                abortSignal,
                db,
                flip: !vec3.equals(scene.up ?? [0, 1, 0], [0, 0, 1]),
            });

            if (boundingSphere) {
                previousBoundingSphere.current = boundingSphere;
                dispatch(renderActions.setCamera({ type: CameraType.Pinhole, zoomTo: boundingSphere }));
                dispatch(imagesActions.setActiveImage(undefined));
            }
        } finally {
            setStatus(Status.Initial);
        }
    };

    const disabled = !highlighted.length;
    return (
        <SpeedDialAction
            {...speedDialProps}
            data-test="flyToSelected"
            FabProps={{
                ...speedDialProps.FabProps,
                disabled,
                style: { ...position, position: "absolute" },
            }}
            onClick={handleClick}
            title={disabled ? undefined : name}
            icon={
                <Box
                    width={1}
                    height={1}
                    position="relative"
                    display="inline-flex"
                    justifyContent="center"
                    alignItems="center"
                >
                    {status === Status.Loading ? (
                        <CircularProgress thickness={2.5} sx={{ position: "absolute" }} />
                    ) : null}
                    <Icon />
                </Box>
            }
        />
    );
}
