import { Box, CircularProgress, SpeedDialActionProps } from "@mui/material";
import { BoundingSphere } from "@novorender/webgl-api";
import { vec3, vec4 } from "gl-matrix";
import { useEffect, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { SpeedDialAction } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useHighlighted } from "contexts/highlighted";
import { getCameraDir } from "features/engine2D/utils";
import { imagesActions } from "features/images";
import { CameraType, renderActions, selectCameraType, selectViewMode } from "features/render";
import { useAbortController } from "hooks/useAbortController";
import { ViewMode } from "types/misc";
import { pointToPlaneDistance } from "utils/math";
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
        state: { db, scene, view },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();
    const cameraType = useAppSelector(selectCameraType);
    const isCrossSection = useAppSelector(selectViewMode) === ViewMode.CrossSection;

    const [status, setStatus] = useState(Status.Initial);

    const previousBoundingSphere = useRef<BoundingSphere>();
    const [abortController, abort] = useAbortController();

    useEffect(() => {
        previousBoundingSphere.current = undefined;
        abort();
        setStatus(Status.Initial);
    }, [highlighted, abort, setStatus]);

    const handleClick = async () => {
        if (!highlighted.length || !view) {
            return;
        }

        const go = (sphere: BoundingSphere) => {
            if (cameraType === CameraType.Pinhole) {
                dispatch(renderActions.setCamera({ type: CameraType.Pinhole, zoomTo: sphere }));
            } else {
                const cameraDir = getCameraDir(view.renderState.camera.rotation);
                let position = sphere.center;

                let radius = sphere.radius;
                if (isCrossSection && view.renderState.clipping.planes.length > 0) {
                    // In cross section try to reduce bounding sphere radius based on
                    // the clipping plane position (use sphere/plane intersection radius)
                    // because visible object part might be much smaller than the full bounding sphere
                    const plane = vec4.copy(vec4.create(), view.renderState.clipping.planes[0].normalOffset);
                    vec4.negate(plane, plane);
                    plane[3] = -plane[3];
                    const dist = pointToPlaneDistance(sphere.center, plane);
                    if (dist > 1e-6 && dist < sphere.radius) {
                        radius = sphere.radius * Math.cos((dist / sphere.radius) * (Math.PI / 2));
                    }
                } else {
                    position = vec3.scaleAndAdd(vec3.create(), sphere.center, cameraDir, -100);
                }
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        goTo: {
                            position,
                            rotation: view.renderState.camera.rotation,
                            fov: radius * 2,
                            far: view.renderState.camera.far,
                        },
                    })
                );
            }
            dispatch(imagesActions.setActiveImage(undefined));
        };

        if (previousBoundingSphere.current) {
            go(previousBoundingSphere.current);
            return;
        }

        setStatus(Status.Loading);

        const abortSignal = abortController.current.signal;
        try {
            const boundingSphere = await objIdsToTotalBoundingSphere({
                ids: highlighted,
                abortSignal,
                db,
                view,
                flip: !vec3.equals(scene.up ?? [0, 1, 0], [0, 0, 1]),
            });

            if (boundingSphere) {
                previousBoundingSphere.current = boundingSphere;
                go(boundingSphere);
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
