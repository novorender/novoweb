import { Box } from "@mui/material";
import { useEffect, useRef } from "react";

import { api } from "app";
import { useExplorerGlobals } from "contexts/explorerGlobals";

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
        state: { canvas, view },
    } = useExplorerGlobals(true);

    const fpsRef = useRef<HTMLTableCellElement | null>(null);
    const activeQualityRef = useRef<HTMLTableCellElement | null>(null);
    const trianglesRef = useRef<HTMLTableCellElement | null>(null);
    const pointsRef = useRef<HTMLTableCellElement | null>(null);
    const renderCallsRef = useRef<HTMLTableCellElement | null>(null);
    const resolutionRef = useRef<HTMLTableCellElement | null>(null);
    const jsMemoryRef = useRef<HTMLTableCellElement | null>(null);
    const deviceProfile = (api as any).deviceProfile ?? {};

    useEffect(
        function startPerformanceStats() {
            const interval = setInterval(update, 200);

            return () => {
                clearInterval(interval);
            };

            function update() {
                const { settings, performanceStatistics: stats } = view;

                if (fpsRef.current) {
                    fpsRef.current.innerText = (stats as { fps?: number }).fps?.toFixed(0) ?? "0";
                }

                if (activeQualityRef.current) {
                    activeQualityRef.current.innerText = settings.quality.detail.value.toFixed(2);
                }

                if (trianglesRef.current) {
                    trianglesRef.current.innerText = `${formatNumber(stats.triangles)} / ${formatNumber(
                        deviceProfile.triangleLimit
                    )}`;
                }

                if (pointsRef.current) {
                    pointsRef.current.innerText = String(formatNumber(stats.points));
                }

                if (renderCallsRef.current) {
                    renderCallsRef.current.innerText = String(stats.drawCalls);
                }

                if (resolutionRef.current) {
                    const scale = settings.quality.resolution.value;
                    const w = canvas.clientWidth * scale * devicePixelRatio;
                    const h = canvas.clientHeight * scale * devicePixelRatio;

                    resolutionRef.current.innerText = `${w.toFixed(0)}x${h.toFixed(0)} - scale: ${scale}`;
                }

                if (jsMemoryRef.current && "memory" in performance) {
                    jsMemoryRef.current.innerText = `${((performance as any).memory.totalJSHeapSize / 1e6).toFixed(
                        0
                    )} / ${((performance as any).memory.jsHeapSizeLimit / 1e6).toFixed(0)} MB`;
                }
            }
        },
        [view, canvas, deviceProfile.triangleLimit]
    );

    return (
        <Box color="lime" fontWeight={"bold"} position="absolute" top={16} left={16} sx={{ pointerEvents: "none" }}>
            <Box component="table" sx={{ "& td": { verticalAlign: "top" } }}>
                <tbody>
                    <tr>
                        <td>Device:</td>
                        <td>
                            {deviceProfile.name}; weak: {String(deviceProfile.weakDevice)}; API v{api.version}; Debug
                            profile: {String((api as any).deviceProfile.debugProfile === true)}
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
                        <td>Active quality:</td>
                        <td ref={activeQualityRef}>1</td>
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
                </tbody>
            </Box>
        </Box>
    );
}
