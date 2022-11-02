import { styled } from "@mui/material";
import { useEffect, useRef, useState } from "react";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { downloadMinimap, MinimapHelper } from "utils/minimap";
import { quat, vec2, vec3 } from "gl-matrix";

const Canvas = styled("canvas")`
    background-color: rgba(255, 255, 255, 0.8);
    position: absolute;
    top: 0;
    left: 0;
`;

export function Minimap() {
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const {
        state: { size, scene, view },
    } = useExplorerGlobals(true);

    let width = Math.min(500, size.width / devicePixelRatio);
    let height = Math.min(500, size.height / devicePixelRatio / 2);
    const [minimap, setMinimap] = useState<MinimapHelper | undefined>(undefined);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null | undefined>(null);
    const animationFrameId = useRef<number>(-1);

    const prevCamPos = useRef<vec3>();
    const prevCamRot = useRef<quat>();

    if (minimap) {
        width = height * minimap.getAspect(); // If aspect changes between pdfs then this needs to be updated
    }

    useEffect(() => {
        const downloadFunc = async () => {
            setMinimap(await downloadMinimap((scene as any).assetUrl));
            setCtx(canvas?.getContext("2d"));
        };
        downloadFunc();
    }, [scene, canvas]);

    useEffect(() => {
        if (minimap && ctx) {
            const img = new Image();
            img.onload = function () {
                if (ctx && minimap) {
                    ctx.drawImage(img, 0, 0, width, height);
                }
            };

            img.src = URL.createObjectURL(minimap.getMinimapImage());
            minimap.pixelHeight = height; //Set canvas height in minimap helper
            minimap.pixelWidth = width; //Set canvas width in minimap helper
        }
    }, [canvas, width, height, ctx, minimap]);

    const clickMinimap = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        if (canvas && minimap) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            view.camera.controller.moveTo(minimap.toWorld(vec2.fromValues(x, y)), view.camera.rotation);
        }
    };
    useEffect(() => {
        animate();
        function animate() {
            // Run every frame to check if the camera has changed
            if (
                !prevCamRot.current ||
                !quat.exactEquals(prevCamRot.current, view.camera.rotation) ||
                !prevCamPos.current ||
                !vec3.exactEquals(prevCamPos.current, view.camera.position)
            ) {
                prevCamRot.current = quat.clone(view.camera.rotation);
                prevCamPos.current = vec3.clone(view.camera.position);
                if (minimap && ctx) {
                    //Update minimap info based on camera position. Returns true if it changed the pdf to another floor
                    minimap.update(view.camera.position);
                    const img = new Image();
                    img.onload = function () {
                        if (ctx && minimap) {
                            //Redraw the image for the minimap
                            ctx.drawImage(img, 0, 0, width, height);

                            //Gets the camera position in minimap space
                            const minimapPos = minimap.toMinimap(view.camera.position);
                            //Gets a cone of the camera direction in minimap space, point[0] is the camera position
                            const dirPath = minimap.directionPoints(view.camera.position, view.camera.rotation);
                            ctx.strokeStyle = "blue";
                            for (let i = 1; i < dirPath.length; ++i) {
                                ctx.beginPath();
                                ctx.lineWidth = 3;
                                ctx.moveTo(dirPath[0][0], dirPath[0][1]);
                                ctx.lineTo(dirPath[i][0], dirPath[i][1]);
                                ctx.stroke();
                            }
                            ctx.fillStyle = "green";
                            ctx.beginPath();
                            ctx.ellipse(minimapPos[0], minimapPos[1], 5, 5, 0, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    };
                    img.src = URL.createObjectURL(minimap.getMinimapImage());
                }
            }

            animationFrameId.current = requestAnimationFrame(() => animate());
        }
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [view, minimap, ctx, height, width]);

    return <Canvas ref={setCanvas} width={width} height={height} onClick={(e) => clickMinimap(e)} />;
}
