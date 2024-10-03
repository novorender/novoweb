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
import { rotationFromDirection } from "@novorender/api/web_app/controller/orientation";
import { ScreenSpaceConversions } from "@novorender/api/web_app/screen_space_conversions";
import { quat, ReadonlyQuat, ReadonlyVec3, vec2, vec3 } from "gl-matrix";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useCameraState } from "contexts/cameraState";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useHidden } from "contexts/hidden";
import { CameraState, drawPart } from "features/engine2D";
import { ColorSettings, getCameraDir } from "features/engine2D/utils";
import { CameraType, renderActions, selectClippingPlanes, selectMainObject } from "features/render";
import { flipCADToGLQuat } from "features/render/utils";
import { getRandomColorForObjectId, hslToVec, vecToHex } from "utils/color";
import { decomposeNormalOffset, pointToPlaneDistance, projectPointOntoPlane, radToDeg } from "utils/math";
import { sleep } from "utils/time";

import { selectDisplaySettings, selectPlaneIndex } from "./selectors";
import { crossSectionActions } from "./slice";
import { ColoringType } from "./types";

const CAMERA_OFFSET = 300;

export function Clipping2d({ width, height }: { width: number; height: number }) {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const generationRef = useRef(0);
    const controllerRef = useRef<OrthoController | null>(null);
    const cameraRef = useRef<RenderStateCamera | null>(null);
    const drawObjectsRef = useRef<DrawProduct[] | null>(null);
    const dispatch = useAppDispatch();
    const displaySettings = useAppSelector(selectDisplaySettings);
    const drawContextRef = useRef<DrawContext | null>(null);
    const cameraState = useCameraState();
    const compassRef = useRef<CompassRef | null>(null);
    const pointerDownRef = useRef<{
        timestamp: number;
        pos: vec2;
    } | null>(null);
    const hidden = useHidden();
    const needRedrawRef = useRef(false);
    const mainObject = useAppSelector(selectMainObject);

    const clippingPlaneCount = useMemo(() => clippingPlanes.planes.length, [clippingPlanes]);
    const planeIndex = useAppSelector(selectPlaneIndex);

    useEffect(() => {
        if (planeIndex !== null && planeIndex >= clippingPlaneCount) {
            dispatch(crossSectionActions.setPlaneIndex(clippingPlaneCount === 0 ? null : clippingPlaneCount - 1));
        } else if (planeIndex === null && clippingPlaneCount > 0) {
            dispatch(crossSectionActions.setPlaneIndex(0));
        }
        cameraRef.current = null;
    }, [dispatch, clippingPlaneCount, planeIndex]);

    const plane = planeIndex === null ? null : (clippingPlanes.planes[planeIndex] ?? null);
    const planeRef = useRef(plane);
    planeRef.current = plane;

    useEffect(() => {
        drawObjectsRef.current = null;
        needRedrawRef.current = true;
    }, [hidden]);

    useEffect(() => {
        cameraRef.current = null;
    }, [clippingPlaneCount]);

    const redraw = useCallback(async () => {
        if (!canvasRef.current) {
            return;
        }

        clearCanvas(canvasRef.current);

        if (
            !cameraRef.current ||
            !view.measure ||
            !plane ||
            !plane.outline.enabled ||
            planeIndex === null ||
            planeIndex >= view.renderState.clipping.planes.length
        ) {
            return;
        }

        drawContextRef.current = {
            width,
            height,
            camera: cameraRef.current,
        };
        if (!drawObjectsRef.current) {
            drawObjectsRef.current = view.getOutlineDrawObjects("clipping", planeIndex, drawContextRef.current, {
                generateLineLabels: displaySettings.showLabels,
            });
        } else {
            for (const product of drawObjectsRef.current) {
                view.measure.draw.updateProduct(product, drawContextRef.current);
            }
        }

        const ctx = canvasRef.current.getContext("2d")!;

        const cameraState = {
            pos: cameraRef.current.position,
            dir: getCameraDir(cameraRef.current.rotation),
            type: CameraType.Orthographic,
        };
        draw(ctx, drawObjectsRef.current, cameraState, {
            mainObject,
            outlineColor: vecToHex(plane.outline.color),
            coloring: displaySettings.coloringType,
        });

        const cameraDir = cameraState.dir;
        const isTopDown = vec3.dot(cameraDir, vec3.fromValues(0, 0, -1)) >= 0.99;

        drawCamera(view, ctx, cameraState, view.renderState.camera, drawContextRef.current);

        if (compassRef.current) {
            compassRef.current.updateCamera(cameraRef.current);
            compassRef.current.setVisible(isTopDown);
        }
    }, [view, plane, planeIndex, width, height, displaySettings, mainObject]);

    useEffect(() => {
        needRedrawRef.current = true;
    }, [cameraState, redraw]);

    const reinitAndRedraw = useCallback(async () => {
        if (!canvasRef.current) {
            return;
        }

        if (!plane) {
            clearCanvas(canvasRef.current);
            return;
        }

        generationRef.current += 1;
        const generation = generationRef.current;

        // Wait for outlines to be generated
        await sleep(0);
        if (generationRef.current !== generation) {
            return;
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
        }

        if (!controllerRef.current) {
            const input = new ControllerInput(canvasRef.current);
            const ortho = new OrthoController(input);
            ortho.attach();
            controllerRef.current = ortho;
        }
        controllerRef.current.init({
            kind: "ortho",
            position: cameraRef.current.position,
            rotation: cameraRef.current.rotation,
            fovMeters: cameraRef.current.fov,
        });

        drawObjectsRef.current = null;

        needRedrawRef.current = true;
    }, [view, plane]);

    useEffect(() => {
        needRedrawRef.current = true;
    }, [redraw]);

    useEffect(() => {
        reinitAndRedraw();
    }, [reinitAndRedraw]);

    useEffect(() => {
        let mounted = true;

        function raf() {
            requestAnimationFrame((elapsedTime) => {
                if (!mounted) {
                    return;
                }
                if (!controllerRef.current || !cameraRef.current) {
                    raf();
                    return;
                }

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

                if (needRedrawRef.current) {
                    redraw();
                    needRedrawRef.current = false;
                }

                raf();
            });
        }

        raf();

        return () => {
            mounted = false;
        };
    }, [redraw]);

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
                    if (!canvasRef.current && ref) {
                        canvasRef.current = ref;
                        reinitAndRedraw();
                    }
                }}
                onPointerDown={handlePointerDown}
                onPointerUp={handlePointerUp}
            />
            {clippingPlaneCount === 0 && <Overlay>No clipping planes</Overlay>}
            {plane && plane.outline.enabled && <Compass onClick={lookNorth} ref={compassRef} />}
            {plane && !plane.outline.enabled && (
                <>
                    <Overlay>
                        <Box>
                            <Box mb={2}>
                                You need to enable outlines for selected clipping plane to see the outlines.
                            </Box>

                            <Button
                                variant="contained"
                                onClick={() => {
                                    dispatch(renderActions.toggleClippingPlaneOutlines(planeIndex!));
                                }}
                            >
                                Enable outlines
                            </Button>
                        </Box>
                    </Overlay>
                </>
            )}
        </Box>
    );
}

function clearCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;
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
    }: { mainObject: number | undefined; coloring: ColoringType; outlineColor: string },
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
