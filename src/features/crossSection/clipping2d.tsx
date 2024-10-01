import { Box } from "@mui/material";
import { Camera, DrawProduct } from "@novorender/api";
import { rotationFromDirection } from "@novorender/api/web_app/controller/orientation";
import { vec3 } from "gl-matrix";
import { useCallback, useEffect, useRef } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraState, drawPart } from "features/engine2D";
import { ColorSettings, getCameraDir } from "features/engine2D/utils";
import { CameraType, selectClippingPlanes } from "features/render";
import { vecToHex, vecToRgb } from "utils/color";
import { sleep } from "utils/time";

export function Clipping2d({ width, height }: { width: number; height: number }) {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const clippingPlanes = useAppSelector(selectClippingPlanes);
    const drawObjectsRef = useRef<DrawProduct[]>([]);
    const generationRef = useRef(0);

    const redraw = useCallback(async () => {
        if (!canvasRef.current) {
            return;
        }

        const planes = clippingPlanes.planes;
        if (planes.length === 0) {
            return;
        }

        generationRef.current += 1;
        const generation = generationRef.current;

        // Wait for outlines to be generated
        await sleep(0);
        if (generationRef.current !== generation) {
            return;
        }

        const plane = planes[0];
        // const cameraDir = planes[0].normalOffset.slice(0, 3) as vec3;
        // vec3.negate(cameraDir, cameraDir);
        const cameraDir = getCameraDir(view.renderState.camera.rotation);
        const camera: Camera = {
            position: view.renderState.camera.position,
            // rotation: rotationFromDirection(cameraDir),
            rotation: view.renderState.camera.rotation,
            near: 0.1,
            far: 1000,
            fov: 20,
            kind: "orthographic",
        };

        // const drawObjects = view.getOutlineDrawObjects("clipping", 0, {
        //     width,
        //     height,
        //     camera,
        // });
        const drawObjects = view.getOutlineDrawObjects("clipping", 0);

        draw(
            canvasRef.current,
            drawObjects,
            {
                pos: camera.position,
                dir: cameraDir,
                type: CameraType.Orthographic,
            },
            vecToHex(plane.outline.color),
        );
    }, [view, clippingPlanes, width, height]);

    useEffect(() => {
        redraw();
    }, [redraw]);

    return (
        <canvas
            width={width}
            height={height}
            ref={(ref) => {
                canvasRef.current = ref;
                redraw();
            }}
        />
    );
}

function draw(canvas: HTMLCanvasElement, products: DrawProduct[], cameraState: CameraState, color: string) {
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const colorSettings: ColorSettings = {
        pointColor: color,
        fillColor: color,
        lineColor: color,
    };

    for (const product of products) {
        for (const object of product.objects) {
            for (const part of object.parts) {
                drawPart(ctx, cameraState, part, colorSettings, 2);
            }
        }
    }
}
