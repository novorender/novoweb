import { Box, CircularProgress, SpeedDialActionProps, Tooltip } from "@mui/material";
import { View } from "@novorender/api";
import { AABB2 } from "@novorender/api/types/measure/worker/brep";
import { BoundingSphere } from "@novorender/webgl-api";
import { vec2, vec3 } from "gl-matrix";
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
import { isRectInsideCircle, pointToPlaneDistance, pointToRectDistance } from "utils/math";
import { objIdsToTotalBoundingSphere } from "utils/objectData";
import { sleep } from "utils/time";

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

    const [tooltipMessage, setTooltipMessage] = useState("");
    const tooltipTimeout = useRef<ReturnType<typeof setTimeout>>();
    const orthoLoadingHandle = useRef(0);

    const showTooltip = (msg: string) => {
        if (tooltipTimeout.current) {
            clearTimeout(tooltipTimeout.current);
        }
        setTooltipMessage(msg);
        tooltipTimeout.current = setTimeout(() => {
            setTooltipMessage("");
        }, 3000);
    };

    useEffect(() => {
        previousBoundingSphere.current = undefined;
        abort();
        setStatus(Status.Initial);
    }, [highlighted, abort, setStatus]);

    const handleClick = async () => {
        if (!highlighted.length || !view) {
            return;
        }

        if (orthoLoadingHandle.current) {
            dispatch(renderActions.removeLoadingHandle(orthoLoadingHandle.current));
            orthoLoadingHandle.current = 0;
        }

        const goToOrtho = async (sphere: BoundingSphere) => {
            if (view.measure && isCrossSection && view.renderState.clipping.planes.length > 0) {
                // In crossection we have outline vertices and can focus them without
                // fetching object metadata.
                // It's not ideal (crossection gets in the center, not the entire visible part of the object),
                // but crossection is probably what people would want to focus in crossection mode.

                const plane = view.renderState.clipping.planes[0];
                const planeToSphereDist = pointToPlaneDistance(sphere.center, plane.normalOffset);
                if (planeToSphereDist > sphere.radius + view.renderState.camera.far) {
                    showTooltip("Object is outside the current cross section view");
                    return;
                }

                const width = window.innerWidth;
                const height = window.innerHeight;
                const screenRect = {
                    min: vec2.fromValues(0, 0),
                    max: vec2.fromValues(width, height),
                };

                const [sphereCenter2d] = view.measure.draw.toMarkerPoints([sphere.center]);

                let visibleRadiusRatio = 0;
                if (sphereCenter2d) {
                    const sphereRadius2d = (height / view.renderState.camera.fov) * sphere.radius;
                    const isSphereCenterInsideScreenRect =
                        sphereCenter2d[0] >= 0 &&
                        sphereCenter2d[0] <= width &&
                        sphereCenter2d[1] >= 0 &&
                        sphereCenter2d[1] <= height;

                    if (
                        isSphereCenterInsideScreenRect ||
                        isRectInsideCircle(screenRect, sphereCenter2d, sphereRadius2d)
                    ) {
                        visibleRadiusRatio = 1;
                    } else {
                        const sphereToRectDist = pointToRectDistance(sphereCenter2d, screenRect);
                        visibleRadiusRatio = (sphereRadius2d - sphereToRectDist) / sphereRadius2d;
                    }
                }

                let loading = 0;
                if (visibleRadiusRatio < 0.5) {
                    orthoLoadingHandle.current = loading = performance.now();
                    dispatch(renderActions.addLoadingHandle(loading));

                    dispatch(
                        renderActions.setCamera({
                            type: CameraType.Orthographic,
                            goTo: {
                                position: sphere.center,
                                rotation: view.renderState.camera.rotation,
                                fov: sphere.radius * 2,
                                far: view.renderState.camera.far,
                            },
                        })
                    );

                    // Wait for camera to move and outlines to be generated
                    await sleep(1000);
                }

                if (loading) {
                    if (loading !== orthoLoadingHandle.current) {
                        return;
                    } else {
                        orthoLoadingHandle.current = 0;
                        dispatch(renderActions.removeLoadingHandle(loading));
                    }
                }

                const outline = getSelectedObjectsCrossectionZoomingParams(view, new Set(highlighted));
                if (outline) {
                    dispatch(
                        renderActions.setCamera({
                            type: CameraType.Orthographic,
                            goTo: {
                                position: outline.position,
                                rotation: view.renderState.camera.rotation,
                                fov: outline.fov,
                                far: view.renderState.camera.far,
                            },
                        })
                    );
                }
            } else {
                const cameraDir = getCameraDir(view.renderState.camera.rotation);
                const position = vec3.scaleAndAdd(vec3.create(), sphere.center, cameraDir, -20);

                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        goTo: {
                            position,
                            rotation: view.renderState.camera.rotation,
                            fov: sphere.radius * 2,
                            far: view.renderState.camera.far,
                        },
                    })
                );
            }
        };

        const go = (sphere: BoundingSphere) => {
            if (cameraType === CameraType.Pinhole) {
                dispatch(renderActions.setCamera({ type: CameraType.Pinhole, zoomTo: sphere }));
            } else {
                goToOrtho(sphere);
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
                <Tooltip open={Boolean(tooltipMessage)} title={tooltipMessage} placement="top">
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
                </Tooltip>
            }
        />
    );
}

function getSelectedObjectsCrossectionZoomingParams(view: View, objectIds: Set<number>) {
    if (!view.measure) {
        return;
    }

    const box = view.getObjectsOutlinePlaneBoundingRectInWorld("clipping", 0, objectIds);
    if (!box) {
        return;
    }

    const center3d = vec3.lerp(vec3.create(), box.min, box.max, 0.5);
    const [screenMin, screenMax] = view.measure.draw.toMarkerPoints([box.min, box.max]);
    if (!screenMin || !screenMax) {
        return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const fovK = getOrthoFovRatioForAABB2(width, height, { min: screenMin, max: screenMax });
    if (!fovK) {
        return;
    }

    return {
        position: center3d,
        fov: view.renderState.camera.fov * fovK,
    };
}

function getOrthoFovRatioForAABB2(screenWidth: number, screenHeight: number, bbox: AABB2): number {
    const width = Math.abs(bbox.max[0] - bbox.min[0]);
    const height = Math.abs(bbox.max[1] - bbox.min[1]);
    const kHeight = screenHeight / height;
    const kWidth = screenWidth / width;
    const k = Math.min(kHeight, kWidth);
    const padding = 0.2;
    return (1 / k) * (1 + padding);
}
