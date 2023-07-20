import { Box } from "@mui/material";
import { packageVersion as webglApiVersion } from "@novorender/web_app";
import { useEffect, useRef } from "react";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectDeviceProfile } from "features/render";

const canvas: HTMLCanvasElement = document.createElement("canvas") as HTMLCanvasElement;
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
        state: { view },
    } = useExplorerGlobals(true);
    const deviceProfile = useAppSelector(selectDeviceProfile);
    const timer = useRef<ReturnType<typeof setInterval>>();
    const cpuTime = useRef<HTMLSpanElement>(null);
    const gpuTime = useRef<HTMLSpanElement>(null);
    const bufferBytes = useRef<HTMLSpanElement>(null);
    const textureBytes = useRef<HTMLSpanElement>(null);
    const jsMem = useRef<HTMLSpanElement>(null);
    const fps = useRef<HTMLSpanElement>(null);
    const triangles = useRef<HTMLSpanElement>(null);
    const lines = useRef<HTMLSpanElement>(null);
    const points = useRef<HTMLSpanElement>(null);
    const primitives = useRef<HTMLSpanElement>(null);
    const drawcalls = useRef<HTMLSpanElement>(null);
    const resolutionScale = useRef<HTMLSpanElement>(null);
    const detailBias = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (timer.current) {
            clearInterval(timer.current);
        }

        timer.current = setInterval(() => {
            const jsMemory = "memory" in performance ? (performance.memory as any).totalJSHeapSize : 0;
            const stats = view.statistics;

            if (
                stats &&
                cpuTime.current &&
                gpuTime.current &&
                bufferBytes.current &&
                textureBytes.current &&
                jsMem.current &&
                fps.current &&
                triangles.current &&
                lines.current &&
                points.current &&
                primitives.current &&
                drawcalls.current &&
                resolutionScale.current &&
                detailBias.current
            ) {
                cpuTime.current.innerText = stats.render?.cpuTime.draw.toFixed(2) ?? "0";
                gpuTime.current.innerText = stats.render?.gpuTime.draw?.toFixed(2) ?? "0";
                bufferBytes.current.innerText = ((stats.render?.bufferBytes ?? 0) / (1024 * 1024)).toFixed(2);
                textureBytes.current.innerText = ((stats.render?.textureBytes ?? 0) / (1024 * 1024)).toFixed(2);
                jsMem.current.innerText = (jsMemory / (1024 * 1024)).toFixed(2);
                fps.current.innerText = (1000 / (stats.render?.frameInterval ?? 1)).toFixed(0);
                triangles.current.innerText = `${formatNumber(stats.render?.triangles ?? 0)}`;
                lines.current.innerText = formatNumber(stats.render?.lines ?? 0);
                points.current.innerText = formatNumber(stats.render?.points ?? 0);
                primitives.current.innerText = `${formatNumber(stats.render?.primitives ?? 0)} / ${formatNumber(
                    deviceProfile.limits.maxPrimitives
                )}`;
                drawcalls.current.innerText = formatNumber(stats.render?.drawCalls ?? 0);
                resolutionScale.current.innerText = `${view?.renderState.output.width}x${
                    view?.renderState.output.height
                }; scale: ${stats.view?.resolution.toFixed(2)}`;
                detailBias.current.innerText = stats.view?.detailBias.toFixed(2);
            }
        }, 200);
    }, [view, deviceProfile.limits.maxPrimitives]);

    return (
        <Box
            color="lime"
            fontWeight={"bold"}
            position="absolute"
            top={0}
            left={0}
            px={1}
            bgcolor={"rgba(0,0,0,0.4)"}
            sx={{ pointerEvents: "none", "& pre": { textWrap: "wrap" } }}
            maxWidth={700}
        >
            <pre className="stats">
                Tier: {deviceProfile.tier}; Debug profile: {String(deviceProfile.debugProfile)}
                <br />
                APP v{import.meta.env.REACT_APP_VERSION}; API v{webglApiVersion};<br />
                GPU: {renderer}
                <br />
                User agent: {navigator.userAgent}
                <br />
                cpu.render: <span ref={cpuTime}>0</span>
                <br />
                gpu.render: <span ref={gpuTime}>0</span>
                <br />
                gpu.buffers: <span ref={bufferBytes}>0</span> MB /{" "}
                {(deviceProfile.limits.maxGPUBytes / (1024 * 1024)).toFixed(2)} MB
                <br />
                gpu.textures: <span ref={textureBytes}>0</span> MB
                <br />
                js.memory: <span ref={jsMem}>0</span> MB /{" "}
                {"memory" in performance
                    ? ((performance as any).memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2)
                    : -420}{" "}
                MB
                <br />
                FPS: <span ref={fps}>0</span>
                <br />
                T/P/L: <span ref={triangles}>0</span> / <span ref={points}>0</span> / <span ref={lines}>0</span>
                <br />
                Primitives: <span ref={primitives}>0</span>
                <br />
                Drawcalls: <span ref={drawcalls}>0</span>
                <br />
                Resolution: <span ref={resolutionScale}>0</span>
                <br />
                Detail bias: <span ref={detailBias}>0</span>
            </pre>
        </Box>
    );
}
