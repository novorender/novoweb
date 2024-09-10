import { styled } from "@mui/material";
import { quat, vec2, vec3 } from "gl-matrix";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

    const width = useMemo(() => Math.min(500, size.width / devicePixelRatio), [size.width]);
    const height = useMemo(() => size.height / 4, [size.height]);
    const [minimap, setMinimap] = useState<MinimapHelper | undefined>(undefined);
    const ctx = useRef<CanvasRenderingContext2D | null>(null);
    const animationFrameId = useRef<number>(-1);

    const prevCamPos = useRef<vec3>();
    const prevCamRot = useRef<quat>();

    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const isPanning = useRef(false);
    const startPan = useRef({ x: 0, y: 0 });
    const lastTouchDistance = useRef<number | null>(null);

    useEffect(() => {
        const downloadFunc = async () => {
            if (canvas) {
                const minimapHelper = await downloadMinimap(db);
                setMinimap(minimapHelper);
                ctx.current = canvas.getContext("2d");
            }
        };
        downloadFunc();
    }, [db, canvas]);

    const drawMinimap = useCallback(
        (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
            ctx.clearRect(0, 0, width, height);

            const imgAspectRatio = img.width / img.height;
            const canvasAspectRatio = width / height;

            let drawWidth, drawHeight;
            if (imgAspectRatio > canvasAspectRatio) {
                drawWidth = width * zoom;
                drawHeight = (width / imgAspectRatio) * zoom;
            } else {
                drawHeight = height * zoom;
                drawWidth = height * imgAspectRatio * zoom;
            }

            const offsetX = (width - drawWidth) / 2 + pan.x;
            const offsetY = (height - drawHeight) / 2 + pan.y;

            ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
        },
        [width, height, zoom, pan],
    );

    useEffect(() => {
        if (minimap && ctx.current) {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                if (!ctx.current) {
                    return;
                }
                minimap.pixelHeight = img.height * 1.5;
                minimap.pixelWidth = img.width * 1.5;
                drawMinimap(ctx.current, img);
            };
            const src = getAssetUrl(view, minimap.getMinimapImage());
            img.src = src.toString();
        }
    }, [canvas, width, height, minimap, view, zoom, pan, drawMinimap]);

    const clickMinimap = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
            if (canvas && minimap) {
                const rect = canvas.getBoundingClientRect();
                const x = (event.clientX - rect.left - pan.x) / zoom;
                const y = (event.clientY - rect.top - pan.y) / zoom;
                const controller = view.controllers["ortho"];
                controller.moveTo(minimap.toWorld(vec2.fromValues(x, y)), 1000, view.renderState.camera.rotation);
            }
        },
        [canvas, minimap, pan, zoom, view],
    );

    const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
        setZoom((prevZoom) => Math.max(0.1, prevZoom - event.deltaY * 0.001));
    }, []);

    const handleMouseDown = useCallback(
        (event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
            isPanning.current = true;
            startPan.current = { x: event.clientX - pan.x, y: event.clientY - pan.y };
        },
        [pan],
    );

    const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement, MouseEvent>) => {
        if (isPanning.current) {
            setPan({ x: event.clientX - startPan.current.x, y: event.clientY - startPan.current.y });
        }
    }, []);

    const handleMouseUp = useCallback(() => {
        isPanning.current = false;
    }, []);

    const handleTouchStart = useCallback(
        (event: React.TouchEvent<HTMLCanvasElement>) => {
            if (event.touches.length === 1) {
                isPanning.current = true;
                startPan.current = { x: event.touches[0].clientX - pan.x, y: event.touches[0].clientY - pan.y };
            } else if (event.touches.length === 2) {
                isPanning.current = false;
                const touch1 = event.touches[0];
                const touch2 = event.touches[1];
                const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
                lastTouchDistance.current = distance;
            }
        },
        [pan],
    );

    const handleTouchMove = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
        if (event.touches.length === 1 && isPanning.current) {
            setPan({
                x: event.touches[0].clientX - startPan.current.x,
                y: event.touches[0].clientY - startPan.current.y,
            });
        } else if (event.touches.length === 2 && lastTouchDistance.current !== null) {
            const touch1 = event.touches[0];
            const touch2 = event.touches[1];
            const distance = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
            const zoomChange = distance / lastTouchDistance.current;
            setZoom((prevZoom) => Math.max(0.1, prevZoom * zoomChange));
            lastTouchDistance.current = distance;
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        isPanning.current = false;
        lastTouchDistance.current = null;
    }, []);

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
                if (minimap && ctx.current) {
                    minimap.update(view.renderState.camera.position);
                    const img = new Image();
                    img.crossOrigin = "anonymous";
                    img.onload = () => {
                        if (!ctx.current) {
                            return;
                        }

                        drawMinimap(ctx.current, img);

                        const minimapPos = minimap.toMinimap(view.renderState.camera.position);
                        const dirPath = minimap.directionPoints(
                            view.renderState.camera.position,
                            view.renderState.camera.rotation,
                        );
                        ctx.current.strokeStyle = "green";
                        ctx.current.lineWidth = 3;
                        ctx.current.beginPath();
                        ctx.current.moveTo(dirPath[0][0], dirPath[0][1]);
                        for (let i = 1; i < dirPath.length; ++i) {
                            ctx.current.lineTo(dirPath[i][0], dirPath[i][1]);
                        }
                        ctx.current.stroke();
                        ctx.current.fillStyle = "green";
                        ctx.current.beginPath();
                        ctx.current.ellipse(minimapPos[0], minimapPos[1], 5, 5, 0, 0, Math.PI * 2);
                        ctx.current.fill();
                    };
                    const src = getAssetUrl(view, minimap.getMinimapImage());
                    img.src = src.toString();
                }
            }
            animationFrameId.current = requestAnimationFrame(animate);
        }
        animate();
        return () => cancelAnimationFrame(animationFrameId.current);
    }, [view, minimap, height, width, zoom, pan, drawMinimap]);

    return (
        <Canvas
            ref={setCanvas}
            width={width}
            height={height}
            onClick={clickMinimap}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        />
    );
}
