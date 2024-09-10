import { styled } from "@mui/material";
import { quat, vec2, vec3 } from "gl-matrix";
import { useEffect, useRef, useState } from "react";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { downloadMinimap, MinimapHelper } from "utils/minimap";
import { getAssetUrl } from "utils/misc";

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
    const height = size.height / 2;
    const [minimap, setMinimap] = useState<MinimapHelper | undefined>(undefined);
    const [ctx, setCtx] = useState<CanvasRenderingContext2D | null | undefined>(null);
    const animationFrameId = useRef<number>(-1);

    const prevCamPos = useRef<vec3>();
    const prevCamRot = useRef<quat>();

    if (minimap) {
        width = height * minimap.getAspect();
    }

    useEffect(() => {
        const downloadFunc = async () => {
            if (canvas) {
                const minimapHelper = await downloadMinimap(db);
                setMinimap(minimapHelper);
                setCtx(canvas.getContext("2d"));
            }
        };
        downloadFunc();
    }, [db, canvas]);

    useEffect(() => {
        if (minimap && ctx) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                minimap.pixelHeight = img.height * 1.5;
                minimap.pixelWidth = img.width * 1.5;
                ctx.clearRect(0, 0, width, height);

                const imgAspectRatio = img.width / img.height;
                const canvasAspectRatio = width / height;

                let drawWidth, drawHeight;
                if (imgAspectRatio > canvasAspectRatio) {
                    drawWidth = width;
                    drawHeight = width / imgAspectRatio;
                } else {
                    drawHeight = height;
                    drawWidth = height * imgAspectRatio;
                }

                const offsetX = (width - drawWidth) / 2;
                const offsetY = (height - drawHeight) / 2;

                ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
            };
            const src = getAssetUrl(view, minimap.getMinimapImage());
            img.src = src.toString();
        }
    }, [canvas, width, height, ctx, minimap, view]);

    const clickMinimap = (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        if (canvas && minimap) {
            const rect = canvas.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            const controller = view.controllers["ortho"];
            controller.moveTo(minimap.toWorld(vec2.fromValues(x, y)), 1000, view.renderState.camera.rotation);
        }
    };

    useEffect(() => {
        function animate() {
            if (
                !prevCamRot.current ||
                !quat.exactEquals(prevCamRot.current, view.renderState.camera.rotation) ||
                !prevCamPos.current ||
                !vec3.exactEquals(prevCamPos.current, view.renderState.camera.position)
            ) {
                prevCamRot.current = quat.clone(view.renderState.camera.rotation);
                prevCamPos.current = vec3.clone(view.renderState.camera.position);
                if (minimap && ctx) {
                    minimap.update(view.renderState.camera.position);
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => {
                        ctx.clearRect(0, 0, width, height);

                        const imgAspectRatio = img.width / img.height;
                        const canvasAspectRatio = width / height;

                        let drawWidth, drawHeight;
                        if (imgAspectRatio > canvasAspectRatio) {
                            drawWidth = width;
                            drawHeight = width / imgAspectRatio;
                        } else {
                            drawHeight = height;
                            drawWidth = height * imgAspectRatio;
                        }

                        const offsetX = (width - drawWidth) / 2;
                        const offsetY = (height - drawHeight) / 2;

                        ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

                        const minimapPos = minimap.toMinimap(view.renderState.camera.position);
                        const dirPath = minimap.directionPoints(
                            view.renderState.camera.position,
                            view.renderState.camera.rotation,
                        );
                        ctx.strokeStyle = "green";
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.moveTo(dirPath[0][0], dirPath[0][1]);
                        for (let i = 1; i < dirPath.length; ++i) {
                            ctx.lineTo(dirPath[i][0], dirPath[i][1]);
                        }
                        ctx.stroke();
                        ctx.fillStyle = "green";
                        ctx.beginPath();
                        ctx.ellipse(minimapPos[0], minimapPos[1], 5, 5, 0, 0, Math.PI * 2);
                        ctx.fill();
                    };
                    const src = getAssetUrl(view, minimap.getMinimapImage());
                    img.src = src.toString();
                }
            }
            animationFrameId.current = requestAnimationFrame(animate);
        }
        animate();
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [view, minimap, ctx, height, width]);

    return <Canvas ref={setCanvas} width={width} height={height} onClick={clickMinimap} />;
}
