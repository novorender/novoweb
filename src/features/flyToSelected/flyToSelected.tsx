import { useEffect, useRef } from "react";
import { BoundingSphere, HierarcicalObjectReference, Scene, View } from "@novorender/webgl-api";
import { Box, CircularProgress, SpeedDialActionProps } from "@mui/material";

import { SpeedDialAction } from "components";
import { config as featuresConfig } from "config/features";
import { searchByPatterns } from "utils/search";
import { useHighlighted } from "contexts/highlighted";
import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { getTotalBoundingSphere } from "utils/objectData";

enum Status {
    Initial,
    Loading,
}

type Props = SpeedDialActionProps & {
    position?: { top?: number; right?: number; bottom?: number; left?: number };
    view: View;
    scene: Scene;
};

export function FlyToSelected({ view, scene, position, ...speedDialProps }: Props) {
    const { name, Icon } = featuresConfig.flyToSelected;
    const highlighted = useHighlighted().ids;

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
            return view.camera.controller.zoomTo(previousBoundingSphere.current);
        }

        setStatus(Status.Loading);

        const abortSignal = abortController.current.signal;
        let nodes = [] as HierarcicalObjectReference[];

        try {
            await searchByPatterns({
                scene,
                abortSignal,
                searchPatterns: [{ property: "id", value: highlighted as any as string[] }],
                callback: (refs) => (nodes = nodes.concat(refs)),
                callbackInterval: 1000,
            });
        } catch {
            return setStatus(Status.Initial);
        }

        const boundingSphere = getTotalBoundingSphere(nodes);

        setStatus(Status.Initial);

        if (boundingSphere) {
            previousBoundingSphere.current = boundingSphere;
            view.camera.controller.zoomTo(boundingSphere);
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
