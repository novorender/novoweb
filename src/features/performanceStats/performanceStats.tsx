import { Box } from "@mui/material";
import { useEffect, useRef, useState } from "react";

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
        state: { view },
    } = useExplorerGlobals(true);
    const [stats, setStats] = useState({ ...view.statistics });
    const timer = useRef<ReturnType<typeof setInterval>>();

    useEffect(() => {
        if (timer.current) {
            clearInterval(timer.current);
        }

        timer.current = setInterval(() => {
            setStats({ ...view.statistics });
        }, 100);
    }, [view]);

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
                Device: {api.deviceProfile.name}; weak: {String(api.deviceProfile.weakDevice)}; Debug profile:{" "}
                {String((api as any).deviceProfile.debugProfile === true)}
                <br />
                APP v{import.meta.env.REACT_APP_VERSION}; API v{api.version};<br />
                GPU: {renderer}
                <br />
                User agent: {navigator.userAgent}
                <br />
                cpu.render: {stats.render?.cpuTime.draw.toFixed(2)}
                <br />
                gpu.render: {stats.render?.gpuTime.draw?.toFixed(2)}
                <br />
                gpu.buffers: {((stats.render?.bufferBytes ?? 0) / (1024 * 1024)).toFixed(2) + " MB"}
                <br />
                gpu.textures: {((stats.render?.textureBytes ?? 0) / (1024 * 1024)).toFixed(2) + " MB"}
                <br />
                FPS: {(1000 / (stats.render?.frameInterval ?? 1)).toFixed(0)}
                <br />
                Triangles: {formatNumber(stats.render?.triangles ?? 0)}
                <br />
                Lines: {formatNumber(stats.render?.lines ?? 0)}
                <br />
                Points: {formatNumber(stats.render?.points ?? 0)}
                <br />
                Drawcalls: {stats.render?.drawCalls ?? 0}
                <br />
                Resolution: {view?.renderState.output.width}x{view?.renderState.output.height}; scale:{" "}
                {stats.view?.resolution.toFixed(2)}
                <br />
                Detail bias: {stats.view?.detailBias.toFixed(2)}
            </pre>
        </Box>
    );
}
