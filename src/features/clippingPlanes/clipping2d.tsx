import { Box } from "@mui/material";
import { Camera, DrawProduct } from "@novorender/api";
import { rotationFromDirection } from "@novorender/api/web_app/controller/orientation";
import { vec3 } from "gl-matrix";
import { useEffect, useMemo, useRef } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraState, drawPart } from "features/engine2D";
import { CameraType } from "features/render";

export function Clipping2d() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const drawObjectsRef = useRef<DrawProduct[]>([]);

    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }

        const planes = view.renderState.clipping.planes;
        if (planes.length === 0) {
            return;
        }

        const cameraDir = planes[0].normalOffset.slice(0, 3) as vec3;
        const camera: Camera = {
            position: view.renderState.camera.position,
            rotation: rotationFromDirection(cameraDir),
            near: 0.1,
            far: 1000,
            fov: 20,
            kind: "orthographic",
        };
        const drawObjects = view.getOutlineDrawObjects("clipping", 0, {
            width: 400,
            height: 400,
            camera,
        });

        draw(canvasRef.current, drawObjects, {
            pos: camera.position,
            dir: cameraDir,
            type: CameraType.Orthographic,
        });
    }, [view]);

    return (
        <Box>
            <canvas width="400" height="400" ref={canvasRef} />
        </Box>
    );
}

function draw(canvas: HTMLCanvasElement, products: DrawProduct[], cameraState: CameraState) {
    const ctx = canvas.getContext("2d")!;

    const pointColor = "red";

    for (const product of products) {
        for (const object of product.objects) {
            for (const part of object.parts) {
                drawPart(
                    ctx,
                    cameraState,
                    part,
                    {
                        pointColor,
                    },
                    2,
                );
            }
        }
    }
}
