import { Box } from "@mui/material";
import { useEffect, useRef } from "react";

import { useExplorerGlobals } from "contexts/explorerGlobals";
import { api } from "app";

const canvas: HTMLCanvasElement = document.createElement("CANVAS") as HTMLCanvasElement;
canvas.width = 1;
canvas.height = 1;
document.body.appendChild(canvas);
const gl = canvas.getContext("webgl", { failIfMajorPerformanceCaveat: true });
canvas.remove();
const debugInfo = gl?.getExtension("WEBGL_debug_renderer_info");
const renderer = debugInfo
    ? gl?.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : gl?.getParameter(gl?.VERSION) ?? "???";

const formatNumber = new Intl.NumberFormat("en-US").format;

export function PerformanceStats() {
    const {
        state: { canvas, view_OLD: view },
    } = useExplorerGlobals(true);

    const detailBiasRef = useRef<HTMLTableCellElement | null>(null);
    const fpsRef = useRef<HTMLTableCellElement | null>(null);
    const trianglesRef = useRef<HTMLTableCellElement | null>(null);
    const pointsRef = useRef<HTMLTableCellElement | null>(null);
    const renderCallsRef = useRef<HTMLTableCellElement | null>(null);
    const resolutionRef = useRef<HTMLTableCellElement | null>(null);
    const jsMemoryRef = useRef<HTMLTableCellElement | null>(null);
    const gpuMemoryRef = useRef<HTMLTableCellElement | null>(null);

    useEffect(
        function startPerformanceStats() {
            const interval = setInterval(update, 200);

            return () => {
                clearInterval(interval);
            };

            function update() {
                const { performanceStatistics: stats } = view;

                if (detailBiasRef.current) {
                    detailBiasRef.current.innerText = `${api.deviceProfile.detailBias} / ortho ${
                        api.deviceProfile.orthoDetailBias
                    } (active: ${view.settings.quality.detail.value.toFixed(
                        2
                    )}, idle: ${view.lastRenderOutput?.isIdleFrame()})`;
                }

                if (fpsRef.current) {
                    fpsRef.current.innerText = (stats as { fps?: number }).fps?.toFixed(0) ?? "0";
                }

                if (trianglesRef.current) {
                    trianglesRef.current.innerText = `${formatNumber(stats.triangles)} / ${formatNumber(
                        api.deviceProfile.triangleLimit
                    )}`;
                }

                if (pointsRef.current) {
                    pointsRef.current.innerText = String(formatNumber(stats.points));
                }

                if (renderCallsRef.current) {
                    renderCallsRef.current.innerText = String(stats.drawCalls);
                }

                if (resolutionRef.current) {
                    const scale = (stats as any).resolutionScale ?? 1;
                    const w = canvas.clientWidth * scale;
                    const h = canvas.clientHeight * scale;

                    resolutionRef.current.innerText = `${w.toFixed(0)}x${h.toFixed(0)} - scale: ${scale}`;
                }

                if (jsMemoryRef.current && "memory" in performance) {
                    jsMemoryRef.current.innerText = `${((performance as any).memory.totalJSHeapSize / 1e6).toFixed(
                        0
                    )} / ${((performance as any).memory.jsHeapSizeLimit / 1e6).toFixed(0)} MB`;
                }

                if (gpuMemoryRef.current && stats.gpuBytes !== undefined) {
                    gpuMemoryRef.current.innerText = `${Math.round(stats.gpuBytes / 1e6)} MB / ${
                        api.deviceProfile.gpuBytesLimit / 1e6
                    } MB`;
                }
            }
        },
        [view, canvas]
    );

    return (
        <Box color="lime" fontWeight={"bold"} position="absolute" top={16} left={16} sx={{ pointerEvents: "none" }}>
            <Box component="table" sx={{ "& td": { verticalAlign: "top" } }}>
                <tbody>
                    <tr>
                        <td>Device:</td>
                        <td>
                            {api.deviceProfile.name}; weak: {String(api.deviceProfile.weakDevice)}; APP v
                            {import.meta.env.REACT_APP_VERSION}; API v{api.version}; Debug profile:{" "}
                            {String((api as any).deviceProfile.debugProfile === true)}
                        </td>
                    </tr>
                    <tr>
                        <td>GPU:</td>
                        <td>{renderer}</td>
                    </tr>
                    <tr>
                        <td>User agent</td>
                        <td>{navigator.userAgent}</td>
                    </tr>
                    <tr>
                        <td>Detail bias:</td>
                        <td ref={detailBiasRef}>{api.deviceProfile.detailBias}</td>
                    </tr>
                    <tr>
                        <td>Resolution:</td>
                        <td ref={resolutionRef}>69x420</td>
                    </tr>
                    <tr>
                        <td>FPS:</td>
                        <td ref={fpsRef}>123</td>
                    </tr>
                    <tr>
                        <td>Triangles:</td>
                        <td ref={trianglesRef}>69</td>
                    </tr>
                    <tr>
                        <td>Points:</td>
                        <td ref={pointsRef}>1337</td>
                    </tr>
                    <tr>
                        <td>Render calls:</td>
                        <td ref={renderCallsRef}>99</td>
                    </tr>
                    <tr>
                        <td>JS memory:</td>
                        <td ref={jsMemoryRef}>666</td>
                    </tr>
                    <tr>
                        <td>GPU memory</td>
                        <td ref={gpuMemoryRef}>??? / {api.deviceProfile.gpuBytesLimit / 1e6} MB</td>
                    </tr>
                </tbody>
            </Box>
        </Box>
    );
}
