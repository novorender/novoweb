import { Fragment, useCallback, TouchEvent, MouseEvent } from "react";
import { extent, bisectLeft, min, max } from "d3-array";
import { Box, Typography, useTheme } from "@mui/material";
import { vec2 } from "gl-matrix";
import { scaleLinear } from "@visx/scale";
import { Axis, Orientation } from "@visx/axis";
import { LinearGradient } from "@visx/gradient";
import { LinePath, Line } from "@visx/shape";
import { Group } from "@visx/group";
import { Text } from "@visx/text";
import { GlyphCircle } from "@visx/glyph";
import { TooltipWithBounds, useTooltip, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";

// const objs = [212, 214, 215, 216];
// const pts = [
//     [0, 6699991.175585205],
//     [0.010000000351072822, 6699991.167478834],
//     [0.010000000351072822, 6699991.175585205],
//     [82.8910527755095, 6699942.638810951],
//     [82.8910527755095, 6699991.175585205],
// ];

// ojbid 8146 nbf master
// const pts = [
//     [0, 6699768.836672768],
//     [7.287728417810739, 6699772.533776209],
//     [7.420584239630998, 6699768.755939105],
//     [7.553020332859261, 6699768.664039376],
//     [27.024467063449208, 6699768.562192192],
// ];

// const pts = [
//     [0, 6699924.0681547485],
//     [34.75313668682716, 6699946.608539481],
//     [42.543665296475915, 6699971.988605044],
//     [23.52986147069269, 6699985.671324779],
// ];
const pts = [
    [6699912.0681547485, 12],
    [6699946.608539481, 24],
    [6699971.988605044, 26.55291],
    [6699985.671324779, 23.51233],
] as [number, number][];

// const pts = [
//     [0, 5],
//     [0.5, 4.9],
//     [1, 4],
//     [3, -1],
//     [5, 0],
//     [6, 0.5],
// ] as [number, number][];

const getX = (d: [number, number]) => d[0];
const getY = (d: [number, number]) => d[1];

const xScale = scaleLinear<number>({
    domain: extent(pts, getX) as [number, number],
    nice: false,
});

const profiles = pts.map(getX);
const heights = pts.map(getY);
const minY = min(heights) ?? 0;
const maxY = max(heights) ?? 0;

const yScale = scaleLinear<number>({
    domain: [minY - Math.abs(minY * 0.15), maxY + Math.abs(maxY * 0.15)] as [number, number],
    nice: 10,
});

const margin = {
    top: 48,
    right: 32,
    bottom: 48,
    left: 48,
};

export function HeightProfileChart({ width: outerWidth, height: outerHeight }: { width: number; height: number }) {
    const theme = useTheme();
    const {
        showTooltip,
        hideTooltip,
        tooltipData,
        tooltipTop = 0,
        tooltipLeft = 0,
    } = useTooltip<{ x: number; y: number }>();
    const xMax = Math.max(outerWidth - margin.left - margin.right, 0);
    const yMax = Math.max(outerHeight - margin.top - margin.bottom, 0);
    xScale.range([0, xMax]);
    yScale.range([yMax, 0]);

    const handleTooltip = useCallback(
        (event: TouchEvent<SVGRectElement> | MouseEvent<SVGRectElement>) => {
            const { x } = localPoint(event) || { x: 0, y: 0 };
            const x0 = xScale.invert(x - margin.left);
            const index = bisectLeft(profiles, x0, 1);
            const pt0 = pts[index - 1];
            const pt1 = pts[index];

            if (!pt0 || !pt1) {
                return;
            }

            const pt = vec2.lerp(vec2.create(), pt1, pt0, (getX(pt1) - x0) / (getX(pt1) - getX(pt0))) as [
                number,
                number
            ];
            const y = getY(pt);

            showTooltip({
                tooltipData: { x: x0, y: y },
                tooltipLeft: xScale(x0),
                tooltipTop: yScale(y),
            });
        },
        [showTooltip]
    );

    return (
        <Box position="relative">
            <svg width={outerWidth} height={outerHeight}>
                <LinearGradient
                    id={"gradient"}
                    from={theme.palette.grey[100]}
                    to={theme.palette.grey[50]}
                    rotate={45}
                />
                <rect x={0} y={0} width={outerWidth} height={outerHeight} fill={`url(#gradient)`} rx={14} />
                <Group transform={`translate(${margin.left} ${margin.top})`}>
                    <rect
                        x={0}
                        y={0}
                        width={xMax}
                        height={yMax}
                        fill={`transparent`}
                        onTouchStart={handleTooltip}
                        onTouchMove={handleTooltip}
                        onMouseMove={handleTooltip}
                        onMouseLeave={() => hideTooltip()}
                    />
                    <LinePath<[number, number]>
                        data={pts}
                        x={(d) => xScale(getX(d)) ?? 0}
                        y={(d) => yScale(getY(d)) ?? 0}
                        stroke={theme.palette.secondary.main}
                        strokeWidth={2}
                        shapeRendering="geometricPrecision"
                        pointerEvents="none"
                    />
                    <Axis
                        orientation={Orientation.left}
                        scale={yScale}
                        numTicks={5}
                        tickLabelProps={() => ({
                            fontSize: 12,
                            dx: "-0.25em",
                            dy: "0.25em",
                            fontFamily: "Roboto, sans-serif",
                            textAnchor: "end",
                        })}
                    />
                    <Axis
                        orientation={Orientation.bottom}
                        top={yMax}
                        scale={xScale}
                        numTicks={5}
                        tickLabelProps={() => ({
                            textAnchor: "middle",
                            fontFamily: "Roboto, sans-serif",
                            fontSize: 12,
                        })}
                    />
                    {pts.map((pt, i, arr) => {
                        if (i === arr.length - 1) {
                            return null;
                        }

                        const pt2 = arr[i + 1];

                        const dist = getX(pt2) - getX(pt);
                        const rise = getY(pt2) - getY(pt);
                        const slope = rise / dist;

                        const yStart = yScale(getY(pt));
                        const yEnd = yScale(getY(pt2));
                        const scaledRise = yEnd - yStart;

                        const xStart = xScale(getX(pt));
                        const xEnd = xScale(getX(pt2));
                        const scaledDist = xEnd - xStart;

                        const yCenter = yScale(getY(pt) + rise / 2);
                        const xCenter = xScale(getX(pt) + dist / 2);
                        const scaledSlope = scaledRise / scaledDist;

                        return (
                            <Fragment key={i}>
                                {i !== 0 ? (
                                    <GlyphCircle left={xStart} top={yStart} fill={theme.palette.secondary.dark} />
                                ) : null}
                                <Text
                                    pointerEvents="none"
                                    y={yCenter}
                                    x={xCenter}
                                    fontSize={12}
                                    fontFamily="Roboto, sans-serif"
                                    dy={"-2em"}
                                    angle={Math.atan(scaledSlope) * (180 / Math.PI)}
                                >
                                    {Math.abs(slope * 100).toFixed(2) + " %"}
                                </Text>
                            </Fragment>
                        );
                    })}
                    {tooltipData && (
                        <Group>
                            <Line
                                from={{ x: tooltipLeft, y: 0 }}
                                to={{ x: tooltipLeft, y: yMax }}
                                stroke={theme.palette.primary.light}
                                strokeOpacity={0.3}
                                strokeWidth={2}
                                pointerEvents="none"
                                strokeDasharray="5,2"
                            />
                            <circle
                                cx={tooltipLeft}
                                cy={tooltipTop}
                                r={5}
                                stroke={theme.palette.primary.main}
                                fill={theme.palette.primary.light}
                                strokeWidth={2}
                                pointerEvents="none"
                            />
                        </Group>
                    )}
                </Group>
            </svg>
            {tooltipData && (
                <div>
                    <TooltipWithBounds
                        top={tooltipTop - 24}
                        left={tooltipLeft + margin.left + 1}
                        style={{
                            ...defaultStyles,
                            background: "white",
                            border: "none",
                            color: theme.palette.secondary.main,
                            fontSize: 16,
                            padding: theme.spacing(1),
                        }}
                    >
                        <Typography>Profile: {tooltipData.x.toFixed(3)}</Typography>
                        <Typography>Elevation: {tooltipData.y.toFixed(3)} m</Typography>
                    </TooltipWithBounds>
                </div>
            )}
        </Box>
    );
}
