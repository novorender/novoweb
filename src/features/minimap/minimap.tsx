import { styled } from "@mui/material";
import { useEffect, useState } from "react";

import { useExplorerGlobals } from "contexts/explorerGlobals";

const Canvas = styled("canvas")`
    background-color: rgba(255, 255, 255, 0.8);
    position: absolute;
    top: 0;
    left: 0;
`;

export function Minimap() {
    const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
    const {
        state: { size },
    } = useExplorerGlobals(true);

    let width = Math.min(500, size.width / devicePixelRatio);
    let height = Math.min(500, size.height / devicePixelRatio / 2);
    width = width > height ? height : width;
    height = height > width ? width : height;

    useEffect(() => {
        const ctx = canvas?.getContext("2d");

        if (!ctx) {
            return;
        }

        const x = (num: number) => (num / 300) * width;
        const y = (num: number) => (num / 300) * height;

        ctx.lineWidth = 10;

        ctx.strokeRect(x(75), y(140), x(150), y(110));

        ctx.fillRect(x(130), y(190), x(40), y(60));

        ctx.beginPath();
        ctx.moveTo(x(50), y(140));
        ctx.lineTo(x(150), y(60));
        ctx.lineTo(x(250), y(140));
        ctx.closePath();
        ctx.stroke();
    }, [canvas, width, height]);

    return <Canvas ref={setCanvas} width={width} height={height} />;
}
