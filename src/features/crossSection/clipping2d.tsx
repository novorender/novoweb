import { Box, Button, css, styled } from "@mui/material";
import { ControllerInput, DrawProduct, OrthoController, RenderStateCamera } from "@novorender/api";
import { rotationFromDirection } from "@novorender/api/web_app/controller/orientation";
import { vec3 } from "gl-matrix";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraState, drawPart } from "features/engine2D";
import { ColorSettings, getCameraDir } from "features/engine2D/utils";
import { CameraType, renderActions, selectClippingPlanes } from "features/render";
import { getRandomColorForObjectId, vecToHex } from "utils/color";
import { decomposeNormalOffset, projectPointOntoPlane } from "utils/math";
import { sleep } from "utils/time";

import { selectDisplaySettings, selectPlaneIndex } from "./selectors";
import { crossSectionActions } from "./slice";
import { ColoringType } from "./types";

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
        cameraRef.current = null;
    }, [clippingPlaneCount]);

    const redraw = useCallback(async () => {
        if (!canvasRef.current) {
            return;
        }

        clearCanvas(canvasRef.current);

        if (!cameraRef.current || !view.measure || !plane || planeIndex === null) {
            return;
        }

        const drawContext = {
            width,
            height,
            camera: cameraRef.current,
        };
        if (!drawObjectsRef.current) {
            drawObjectsRef.current = view.getOutlineDrawObjects("clipping", planeIndex, drawContext, {
                generateLineLabels: displaySettings.showLabels,
            });
        } else {
            for (const product of drawObjectsRef.current) {
                view.measure.draw.updateProduct(product, drawContext);
            }
        }

        draw(
            canvasRef.current,
            drawObjectsRef.current,
            {
                pos: cameraRef.current.position,
                dir: getCameraDir(cameraRef.current.rotation),
                type: CameraType.Orthographic,
            },
            { outlineColor: vecToHex(plane.outline.color), coloring: displaySettings.coloringType },
        );
    }, [view, plane, planeIndex, width, height, displaySettings]);

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

        const cameraDir = plane.normalOffset.slice(0, 3) as vec3;
        vec3.negate(cameraDir, cameraDir);
        const rotation = rotationFromDirection(cameraDir);
        const position = vec3.clone(plane.anchorPos ?? view.renderState.camera.position);

        if (!cameraRef.current) {
            cameraRef.current = {
                position,
                rotation,
                near: 0.1,
                far: 1000,
                fov: 50,
                kind: "orthographic",
                pivot: undefined,
            };
        } else {
            const { normal, point } = decomposeNormalOffset(plane.normalOffset);
            cameraRef.current = {
                ...cameraRef.current,
                position: projectPointOntoPlane(cameraRef.current.position, normal, point),
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

        redraw();
    }, [view, plane, redraw]);

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
                    let newPosition = stateChanges.camera.position as vec3;
                    if (newPosition) {
                        const { normal, point } = decomposeNormalOffset(plane.normalOffset);
                        newPosition = projectPointOntoPlane(newPosition, normal, point);
                    }
                    Object.assign(cameraRef.current, {
                        ...stateChanges.camera,
                        position: newPosition ?? cameraRef.current.position,
                    });
                    redraw();
                }
                raf();
            });
        }

        raf();

        return () => {
            mounted = false;
        };
    }, [redraw]);

    return (
        <Box position="relative" width={width} height={height}>
            <canvas
                width={width}
                height={height}
                ref={(ref) => {
                    canvasRef.current = ref;
                    reinitAndRedraw();
                }}
            />
            {clippingPlaneCount === 0 && <Overlay>No clipping planes</Overlay>}
            {plane && !plane.outline.enabled && (
                <Overlay>
                    <Box>
                        <Box mb={2}>You need to enable outlines for selected clipping plane to see the outlines.</Box>

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
            )}
        </Box>
    );
}

function clearCanvas(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function draw(
    canvas: HTMLCanvasElement,
    products: DrawProduct[],
    cameraState: CameraState,
    { coloring, outlineColor }: { coloring: ColoringType; outlineColor: string },
) {
    const ctx = canvas.getContext("2d")!;

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
        if (coloring !== ColoringType.OutlinesColor && typeof product.ObjectId === "number") {
            const rgb = getRandomColorForObjectId(product.ObjectId);
            color = vecToHex(rgb);
        }
        colorSettings.pointColor = color;
        colorSettings.fillColor = color;
        colorSettings.lineColor = color;

        for (const object of product.objects) {
            for (const part of object.parts) {
                drawPart(ctx, cameraState, part, colorSettings, 2, textSettings);
            }
        }
    }
}

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
