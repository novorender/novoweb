import { Box } from "@material-ui/core";
import { View } from "@novorender/webgl-api";
import { useEffect, useRef } from "react";

type Props = {
    view: View;
    canvas: HTMLCanvasElement;
};

export function PerformanceStats({ view, canvas }: Props) {
    const fpsRef = useRef<HTMLTableDataCellElement | null>(null);
    const activeQualityRef = useRef<HTMLTableDataCellElement | null>(null);
    const trianglesRef = useRef<HTMLTableDataCellElement | null>(null);
    const pointsRef = useRef<HTMLTableDataCellElement | null>(null);
    const renderCallsRef = useRef<HTMLTableDataCellElement | null>(null);
    const resolutionRef = useRef<HTMLTableDataCellElement | null>(null);
    const jsMemoryRef = useRef<HTMLTableDataCellElement | null>(null);

    useEffect(
        function startPerformanceStats() {
            let timeout = update();

            return () => {
                clearTimeout(timeout);
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
                    trianglesRef.current.innerText = String(stats.triangles);
                }

                if (pointsRef.current) {
                    pointsRef.current.innerText = String(stats.points);
                }

                if (renderCallsRef.current) {
                    renderCallsRef.current.innerText = String(stats.drawCalls);
                }

                if (resolutionRef.current) {
                    const scale = settings.quality.resolution.value;
                    const w = canvas.clientWidth * scale;
                    const h = canvas.clientHeight * scale;

                    resolutionRef.current.innerText = `${w.toFixed(0)}x${h.toFixed(0)}`;
                }

                if (jsMemoryRef.current && "memory" in performance) {
                    jsMemoryRef.current.innerText = `${(
                        (performance as any).memory.totalJSHeapSize /
                        (1024 * 1024)
                    ).toFixed(0)}/${((performance as any).memory.jsHeapSizeLimit / (1024 * 1024)).toFixed(0)} MB`;
                }

                return setTimeout(update, 200);
            }
        },
        [view, canvas]
    );

    return (
        <Box color="lime" fontWeight={"bold"} height={200} width={300} position="absolute" top={16} left={16}>
            <table>
                <tbody>
                    <tr>
                        <td>FPS:</td>
                        <td ref={fpsRef}>123</td>
                    </tr>
                    <tr>
                        <td>Active quality:</td>
                        <td ref={activeQualityRef}>1</td>
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
                        <td>Resolution:</td>
                        <td ref={resolutionRef}>69x420</td>
                    </tr>
                    <tr>
                        <td>JS memory:</td>
                        <td ref={jsMemoryRef}>666</td>
                    </tr>
                </tbody>
            </table>
        </Box>
    );
}
