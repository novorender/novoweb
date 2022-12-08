import { useEffect, useRef } from "react";
import { BoundingSphere } from "@novorender/webgl-api";
import { Box, CircularProgress, SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { panoramasActions, PanoramaStatus } from "features/panoramas";
import { useHighlighted } from "contexts/highlighted";
import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { objIdsToTotalBoundingSphere } from "utils/objectData";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useAppDispatch } from "app/store";
import { CameraType, renderActions } from "slices/renderSlice";

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
        state: { scene },
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
            dispatch(renderActions.setCamera({ type: CameraType.Flight, zoomTo: previousBoundingSphere.current }));
            return;
        }

        setStatus(Status.Loading);

        const abortSignal = abortController.current.signal;
        try {
            const boundingSphere = await objIdsToTotalBoundingSphere({ ids: highlighted, abortSignal, scene });

            if (boundingSphere) {
                previousBoundingSphere.current = boundingSphere;
                dispatch(renderActions.setCamera({ type: CameraType.Flight, zoomTo: boundingSphere }));
                dispatch(panoramasActions.setStatus(PanoramaStatus.Initial));
            }
        } finally {
            setStatus(Status.Initial);
        }
    };

    return (
        <SpeedDialAction
            {...speedDialProps}
            data-test="flyToSelected"
            FabProps={{
                ...speedDialProps.FabProps,
                style: { ...position, position: "absolute" },
                disabled: !highlighted.length,
            }}
            onClick={handleClick}
            title={name}
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
