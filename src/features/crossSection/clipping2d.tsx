import { Box, Button, css, IconButton, Paper, styled, SvgIcon, useTheme } from "@mui/material";
import {
    computeRotation,
    ControllerInput,
    DrawContext,
    DrawProduct,
    OrthoController,
    RenderStateCamera,
    View,
} from "@novorender/api";
import { ScreenSpaceConversions } from "@novorender/api";
import { rotationFromDirection } from "@novorender/api/web_app/controller/orientation";
import { quat, ReadonlyQuat, ReadonlyVec3, vec2, vec3 } from "gl-matrix";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useCameraState } from "contexts/cameraState";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useHidden } from "contexts/hidden";
import { CameraState, drawPart } from "features/engine2D";
import { ColorSettings, getCameraDir } from "features/engine2D/utils";
import {
    CameraType,
    renderActions,
    selectClippingPlanes,
    selectDefaultVisibility,
    selectMainObject,
} from "features/render";
import { flipCADToGLQuat } from "features/render/utils";
import { getRandomColorForObjectId, hslToVec, vecToHex } from "utils/color";
import { decomposeNormalOffset, pointToPlaneDistance, projectPointOntoPlane, radToDeg } from "utils/math";

import { selectDisplaySettings, selectPlaneIndex } from "./selectors";
import { crossSectionActions } from "./slice";
import { ColoringType } from "./types";

const CAMERA_OFFSET = 300;

export function Clipping2d({ width, height }: { width: number; height: number }) {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const dispatch = useAppDispatch();
    const displaySettings = useAppSelector(selectDisplaySettings);
    const cameraState = useCameraState();
    const hidden = useHidden();
    const mainObject = useAppSelector(selectMainObject);
    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const planeIndex = useAppSelector(selectPlaneIndex);

    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const controllerRef = useRef<OrthoController | null>(null);
    const cameraRef = useRef<RenderStateCamera | null>(null);
    const drawObjectsRef = useRef<DrawProduct[] | null>(null);
    const drawContextRef = useRef<DrawContext | null>(null);
    const compassRef = useRef<CompassRef | null>(null);
    const pointerDownRef = useRef<{
        timestamp: number;
        pos: vec2;
    } | null>(null);
    const needRedrawRef = useRef(false);
    const prevOutlinesOnRef = useRef(view?.renderState.outlines.on ?? false);
    const prevTrianglesRendered = useRef(0);

    const clippingPlaneCount = useMemo(() => clippingPlanes.planes.length, [clippingPlanes]);

    const plane = planeIndex === null ? null : (clippingPlanes.planes[planeIndex] ?? null);
    const planeRef = useRef(plane);
    planeRef.current = plane;

    useEffect(() => {
        if (planeIndex !== null && planeIndex >= clippingPlaneCount) {
            dispatch(crossSectionActions.setPlaneIndex(clippingPlaneCount === 0 ? null : clippingPlaneCount - 1));
        } else if (planeIndex === null && clippingPlaneCount > 0) {
            dispatch(crossSectionActions.setPlaneIndex(0));
        }
    }, [dispatch, clippingPlaneCount, planeIndex]);

    useEffect(() => {
        drawObjectsRef.current = null;
        needRedrawRef.current = true;
    }, [plane, hidden, defaultVisibility, displaySettings.showLabels]);

    const planeNormalStr = plane ? plane.normalOffset.slice(0, 3).join(",") : null;
    useEffect(() => {
        cameraRef.current = null;
    }, [planeNormalStr]);

    const redraw = useCallback(async () => {
        if (!ctxRef.current) {
            return;
        }

        clearCanvas(ctxRef.current);

        if (!view.measure || !plane || !plane.outline.enabled || !clippingPlanes.outlines || planeIndex === null) {
            compassRef.current?.setVisible(false);
            return;
        }

        if (!controllerRef.current) {
            const input = new ControllerInput(ctxRef.current.canvas);
            const ortho = new OrthoController(input);
            ortho.attach();
            controllerRef.current = ortho;
            cameraRef.current = null;
        }

        if (!cameraRef.current) {
            const cameraDir = plane.normalOffset.slice(0, 3) as vec3;
            const rotation = rotationFromDirection(cameraDir);
            const position = vec3.clone(plane.anchorPos ?? view.renderState.camera.position);
            vec3.scaleAndAdd(position, position, cameraDir, CAMERA_OFFSET);

            cameraRef.current = {
                position,
                rotation,
                near: 0.1,
                far: 1000,
                fov: 50,
                kind: "orthographic",
                pivot: undefined,
            };

            controllerRef.current.init({
                kind: "ortho",
                position: cameraRef.current.position,
                rotation: cameraRef.current.rotation,
                fovMeters: cameraRef.current.fov,
            });
        }

        drawContextRef.current = {
            width,
            height,
            camera: cameraRef.current,
        };
        if (!drawObjectsRef.current) {
            drawObjectsRef.current = view.getOutlineDrawObjects("clipping", planeIndex, drawContextRef.current, {
                generateLineLabels: displaySettings.showLabels,
                closed: false,
                angles: false,
            });
        } else {
            for (const product of drawObjectsRef.current) {
                view.measure.draw.updateProduct(product, drawContextRef.current);
            }
        }

        const cameraState = {
            pos: cameraRef.current.position,
            dir: getCameraDir(cameraRef.current.rotation),
            type: CameraType.Orthographic,
        };
        draw(ctxRef.current, drawObjectsRef.current, cameraState, {
            mainObject,
            outlineColor: vecToHex(plane.outline.color),
            coloring: displaySettings.coloringType,
        });

        const cameraDir = cameraState.dir;
        const isTopDown = vec3.dot(cameraDir, vec3.fromValues(0, 0, -1)) >= 0.99;

        drawCamera(view, ctxRef.current, cameraState, view.renderState.camera, drawContextRef.current);

        if (compassRef.current) {
            compassRef.current.updateCamera(cameraRef.current);
            compassRef.current.setVisible(isTopDown);
        }
    }, [view, plane, planeIndex, width, height, displaySettings, mainObject, clippingPlanes.outlines]);

    useEffect(() => {
        needRedrawRef.current = true;
    }, [cameraState, redraw]);

    useEffect(() => {
        let mounted = true;
        let rafRef: number | null = null;

        function raf() {
            rafRef = requestAnimationFrame((elapsedTime) => {
                if (!mounted) {
                    return;
                }
                rafRef = null;

                // Outlines are turned off when camera moves and are enabled on idle frame
                // Instead of passing event from render we can check that outlines are back
                let scheduleRedraw = false;
                const outlinesOn = view?.renderState.outlines.on ?? false;
                if (outlinesOn && !prevOutlinesOnRef.current) {
                    scheduleRedraw = true;
                }
                prevOutlinesOnRef.current = outlinesOn;

                // When we enable subtrees (e.g. mesh) or jump to a new place - nodes may start loading progressively
                // and it may take some time. ATM there's no way AFAIK to figure out that new nodes are loaded,
                // but we probably can rely on statistics
                const triangles = view?.statistics?.render.triangles ?? 0;
                if (outlinesOn && triangles !== prevTrianglesRendered.current) {
                    scheduleRedraw = true;
                }
                prevTrianglesRendered.current = triangles;

                if (controllerRef.current && cameraRef.current) {
                    const stateChanges = controllerRef.current.renderStateChanges(cameraRef.current, elapsedTime);
                    const plane = planeRef.current;
                    if (stateChanges?.camera && plane) {
                        const newPosition = stateChanges.camera.position as vec3;
                        Object.assign(cameraRef.current, {
                            ...stateChanges.camera,
                            position: newPosition ?? cameraRef.current.position,
                        });
                        needRedrawRef.current = true;
                    }
                }

                if (needRedrawRef.current) {
                    redraw();
                    needRedrawRef.current = false;
                }

                if (scheduleRedraw) {
                    drawObjectsRef.current = null;
                    needRedrawRef.current = true;
                }

                raf();
            });
        }

        raf();

        return () => {
            mounted = false;
            if (rafRef !== null) {
                cancelAnimationFrame(rafRef);
            }
        };
    }, [view, redraw]);

    const updateCamera = (update: Partial<RenderStateCamera>) => {
        if (!cameraRef.current) {
            return;
        }

        Object.assign(cameraRef.current, update);
        if (controllerRef.current) {
            controllerRef.current.init({
                kind: "ortho",
                position: cameraRef.current.position,
                rotation: cameraRef.current.rotation,
                fovMeters: cameraRef.current.fov,
            });
        }
    };

    const lookNorth = () => {
        if (!cameraRef.current) {
            return;
        }

        const angle = radToDeg(getNorthAngle(cameraRef.current.rotation));
        const rotation = flipCADToGLQuat(computeRotation(-angle, 0, 0));
        quat.multiply(rotation, cameraRef.current.rotation, rotation);
        updateCamera({ rotation });

        needRedrawRef.current = true;
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        pointerDownRef.current = {
            timestamp: new Date().getTime(),
            pos: getPointerPos(e),
        };
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!pointerDownRef.current || !drawContextRef.current || !view || !plane) {
            return;
        }

        const now = new Date().getTime();
        const pos = getPointerPos(e);
        const isClick = now - pointerDownRef.current.timestamp < 500 && vec2.dist(pos, pointerDownRef.current.pos) < 20;

        if (!isClick) {
            return;
        }

        const convert = new ScreenSpaceConversions(drawContextRef.current);
        const [pos3d] = convert.screenSpaceToWorldSpace([pos]);

        const mainCamera = view.renderState.camera;
        const mainCameraToPlaneDist = pointToPlaneDistance(mainCamera.position, plane.normalOffset);
        const { point, normal } = decomposeNormalOffset(plane.normalOffset);
        const position = projectPointOntoPlane(pos3d, normal, point);
        vec3.scaleAndAdd(position, position, normal, mainCameraToPlaneDist);

        dispatch(
            renderActions.setCamera({
                type: mainCamera.kind === "orthographic" ? CameraType.Orthographic : CameraType.Pinhole,
                goTo: {
                    position,
                    rotation: mainCamera.rotation,
                },
            }),
        );
    };

    return (
        <Box position="relative" width={width} height={height}>
            <canvas
                width={width}
                height={height}
                ref={(ref) => {
                    if (!ctxRef.current && ref) {
                        ctxRef.current = ref.getContext("2d");
                        needRedrawRef.current = true;
                    }
                }}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
            />
            {plane && plane.outline.enabled && <Compass onClick={lookNorth} ref={compassRef} />}
            {clippingPlaneCount === 0 ? (
                <Overlay>{t("noClippingPlanes")}</Overlay>
            ) : !clippingPlanes.outlines ? (
                <>
                    <Overlay>
                        <Box>
                            <Box mb={2}>{t("youNeedToEnableOutlines")}</Box>

                            <Button
                                variant="contained"
                                onClick={() => {
                                    dispatch(renderActions.setClippingPlanes({ outlines: true }));
                                }}
                            >
                                {t("enableOutlines")}
                            </Button>
                        </Box>
                    </Overlay>
                </>
            ) : plane && !plane.outline.enabled ? (
                <>
                    <Overlay>
                        <Box>
                            <Box mb={2}>{t("youNeedToEnableOutlinesForSelectedClippingPlaneToSeeTheOutlines")}</Box>

                            <Button
                                variant="contained"
                                onClick={() => {
                                    dispatch(renderActions.toggleClippingPlaneOutlines(planeIndex!));
                                }}
                            >
                                {t("enableOutlines")}
                            </Button>
                        </Box>
                    </Overlay>
                </>
            ) : null}
        </Box>
    );
}

function clearCanvas(ctx: CanvasRenderingContext2D) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function draw(
    ctx: CanvasRenderingContext2D,
    products: DrawProduct[],
    cameraState: CameraState,
    {
        mainObject,
        coloring,
        outlineColor,
    }: {
        mainObject: number | undefined;
        coloring: ColoringType;
        outlineColor: string;
    },
) {
    const colorSettings: ColorSettings = {
        pointColor: outlineColor,
        fillColor: outlineColor,
        lineColor: outlineColor,
    };

    const textSettings = {
        type: "default" as const,
        unit: "m",
    };

    for (const product of products) {
        let color = outlineColor;
        let pixelWidth = 2;
        if (mainObject !== undefined && mainObject === product.ObjectId) {
            color = "red";
            pixelWidth = 4;
        } else if (coloring !== ColoringType.OutlinesColor && typeof product.ObjectId === "number") {
            const rgb = getRandomColorForObjectId(product.ObjectId);
            color = vecToHex(rgb);
        }
        colorSettings.pointColor = color;
        colorSettings.fillColor = color;
        colorSettings.lineColor = color;

        for (const object of product.objects) {
            for (const part of object.parts) {
                drawPart(ctx, cameraState, part, colorSettings, pixelWidth, textSettings);
            }
        }
    }
}

function drawCamera(
    view: View,
    ctx: CanvasRenderingContext2D,
    camera: CameraState,
    renderedCamera: RenderStateCamera,
    drawContext: DrawContext,
) {
    if (!view.measure) {
        return;
    }

    const p0 = vec3.clone(renderedCamera.position);
    const dir = getCameraDir(renderedCamera.rotation);
    const up = getUp(renderedCamera.rotation);
    const pOffset = vec3.scaleAndAdd(vec3.create(), p0, dir, 2);
    const pNormal = vec3.cross(vec3.create(), dir, up);

    let points: ReadonlyVec3[];
    if (renderedCamera.kind === "pinhole") {
        const p1 = vec3.scaleAndAdd(vec3.create(), pOffset, pNormal, -1);
        const p2 = vec3.scaleAndAdd(vec3.create(), pOffset, pNormal, 1);
        points = [p0, p1, p2];
    } else {
        const p1 = vec3.scaleAndAdd(vec3.create(), p0, pNormal, -1);
        const p2 = vec3.scaleAndAdd(vec3.create(), pOffset, pNormal, -1);
        const p3 = vec3.scaleAndAdd(vec3.create(), pOffset, pNormal, 1);
        const p4 = vec3.scaleAndAdd(vec3.create(), p0, pNormal, 1);
        points = [p1, p2, p3, p4];
    }

    // camera plane
    const cameraProduct = view.measure.draw.getDrawObjectFromPoints(
        points,
        {
            angles: false,
            generateLineLabels: false,
            closed: true,
        },
        drawContext,
    );

    const dot = vec3.dot(dir, vec3.fromValues(0, 0, -1));
    const fillColorVec = hslToVec(0, 0, 0.3 + (1 - Math.abs(dot)) * 0.4);
    const fillColor = vecToHex([...fillColorVec, 0.7]);

    if (cameraProduct) {
        for (const object of cameraProduct.objects) {
            for (const part of object.parts) {
                drawPart(
                    ctx,
                    camera,
                    part,
                    {
                        lineColor: "#aaa",
                        pointColor: "#aaa",
                        fillColor,
                    },
                    2,
                );
            }
        }
    }

    // point
    const pointProduct = view.measure.draw.getDrawObjectFromPoints([p0], undefined, drawContext);
    if (pointProduct) {
        for (const object of pointProduct.objects) {
            for (const part of object.parts) {
                drawPart(ctx, camera, part, { pointColor: "#2196F3" }, 10);
            }
        }
    }
}

function getNorthAngle(rotation: ReadonlyQuat) {
    const up = vec3.transformQuat(vec3.create(), vec3.fromValues(0, 1, 0), rotation);
    up[2] = 0;
    vec3.normalize(up, up);
    return Math.atan2(up[1], up[0]) - Math.PI / 2;
}

type CompassRef = {
    updateCamera: (camera: RenderStateCamera) => void;
    setVisible: (value: boolean) => void;
};

const Compass = forwardRef(function Compass({ onClick }: { onClick: () => void }, ref) {
    const theme = useTheme();
    const [angle, setAngle] = useState(0);
    const [visible, setVisible] = useState(false);

    useImperativeHandle(
        ref,
        () =>
            ({
                updateCamera(camera: RenderStateCamera) {
                    setAngle(getNorthAngle(camera.rotation));
                },
                setVisible(value: boolean) {
                    setVisible(value);
                },
            }) as CompassRef,
    );

    return (
        <Paper
            sx={{
                borderRadius: "50%",
                position: "absolute",
                left: theme.spacing(1),
                top: theme.spacing(1),
                display: visible ? "block" : "none",
            }}
        >
            <IconButton onClick={onClick}>
                <SvgIcon>
                    <svg
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ rotate: `${angle}rad` }}
                    >
                        <path d="M 12 1 l -6 10 l 1 1 l 5 -2 l 5 2 l 1 -1 z" fill={theme.palette.primary.main} />
                        <path d="M 12 23 l 6 -10 l -1 -1 l -5 2 l -5 -2 l -1 1 z" />
                    </svg>
                </SvgIcon>
            </IconButton>
        </Paper>
    );
});

const Overlay = styled(Box)(
    ({ theme }) => css`
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        display: grid;
        place-items: center;
        padding: ${theme.spacing(2)};
        text-align: center;
        color: grey;
    `,
);

function getUp(rotation: quat) {
    return vec3.transformQuat(vec3.create(), vec3.fromValues(0, 1, 0), rotation);
}

function getPointerPos(e: React.PointerEvent) {
    return vec2.fromValues(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
}
