import { styled } from "@mui/material";
import { quat, vec2, vec3 } from "gl-matrix";
import { useEffect, useRef, useState } from "react";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { downloadMinimap, MinimapHelper } from "utils/minimap";

const Canvas = styled("canvas")`
    background-color: rgba(255, 255, 255, 0.8);
    position: absolute;
    top: 0;
    left: 0;
`;

export function Minimap() {
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const {
        state: { size, db, view },
    } = useExplorerGlobals(true);

    let width = Math.min(500, size.width / devicePixelRatio);
    const height = size.height;
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
            if (canvas) {
                setMinimap(await downloadMinimap(db));
                setCtx(canvas?.getContext("2d"));
            }
        };
        downloadFunc();
    }, [db, canvas]);

    useEffect(() => {
        if (minimap && ctx) {
            const img = new Image();
            img.onload = function () {
                minimap.pixelHeight = img.height * 1.5; //Set canvas height in minimap helper
                minimap.pixelWidth = img.width * 1.5; //Set canvas width in minimap helper
                if (ctx && minimap) {
                    //ctx.drawImage(img, 450, 200, img.width * 0.7, img.height * 0.7, 0, 0, width, height);
                    ctx.drawImage(img, 300, 0, img.width, img.height, 0, 0, img.width * 1.5, img.height * 1.5);
                }
                //minimap.pixelHeight = height; //Set canvas height in minimap helper
                //minimap.pixelWidth = width; //Set canvas width in minimap helper
            };

            img.src = minimap.getMinimapImage();
        }
    }, [canvas, width, height, ctx, minimap]);

    const clickMinimap = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        if (canvas && minimap) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            // view.renderState.camera.controller.moveTo(
            //     minimap.toWorld(vec2.fromValues(x * (1 / 0.7) + 300, y * (1 / 0.7) + 200)),
            //     view.renderState.camera.rotation
            // );

            // view.renderState.camera.controller.moveTo(minimap.toWorld(vec2.fromValues(x + 300 * 1.5, y)), view.renderState.camera.rotation);
            const controller = view.controllers["ortho"];
            controller.moveTo(minimap.toWorld(vec2.fromValues(x + 450, y)), 1000, view.renderState.camera.rotation);
        }
    };
    useEffect(() => {
        animate();
        function animate() {
            // Run every frame to check if the camera has changed
            if (
                !prevCamRot.current ||
                !quat.exactEquals(prevCamRot.current, view.renderState.camera.rotation) ||
                !prevCamPos.current ||
                !vec3.exactEquals(prevCamPos.current, view.renderState.camera.position)
            ) {
                prevCamRot.current = quat.clone(view.renderState.camera.rotation);
                prevCamPos.current = vec3.clone(view.renderState.camera.position);
                if (minimap && ctx) {
                    //Update minimap info based on camera position. Returns true if it changed the pdf to another floor
                    minimap.update(view.renderState.camera.position);
                    const img = new Image();
                    img.onload = function () {
                        if (ctx && minimap) {
                            //Redraw the image for te minimap
                            ctx.clearRect(0, 0, width / 2, height);

                            //ctx.drawImage(img, 450, 200, img.width * 0.7, img.height * 0.7, 0, 0, width, height);
                            ctx.drawImage(img, 300, 0, img.width, img.height, 0, 0, img.width * 1.5, img.height * 1.5);

                            //Gets the camera position in minimap space
                            const minimapPos = minimap.toMinimap(view.renderState.camera.position);
                            minimapPos[0] -= 300 * 1.5;
                            //minimapPos[1] -= 200;
                            //Gets a cone of the camera direction in minimap space, point[0] is the camera position
                            const dirPath = minimap.directionPoints(
                                view.renderState.camera.position,
                                view.renderState.camera.rotation,
                            );
                            ctx.strokeStyle = "green";
                            for (let i = 1; i < dirPath.length; ++i) {
                                ctx.beginPath();
                                ctx.lineWidth = 3;
                                ctx.moveTo(dirPath[0][0] - 300 * 1.5, dirPath[0][1]);
                                ctx.lineTo(dirPath[i][0] - 300 * 1.5, dirPath[i][1]);
                                ctx.stroke();
                            }
                            ctx.fillStyle = "green";
                            ctx.beginPath();
                            ctx.ellipse(minimapPos[0], minimapPos[1], 5, 5, 0, 0, Math.PI * 2);
                            ctx.fill();
                        }
                    };
                    img.src = minimap.getMinimapImage();
                }
            }

            animationFrameId.current = requestAnimationFrame(() => animate());
        }
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [view, minimap, ctx, height, width]);

    return <Canvas ref={setCanvas} width={width / 2} height={height} onClick={(e) => clickMinimap(e)} />;
}
