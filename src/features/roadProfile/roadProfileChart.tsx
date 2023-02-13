import { Fragment, useCallback, TouchEvent, MouseEvent, useMemo } from "react";
import { bisectLeft, min, max } from "d3-array";
import { Box, Typography, useTheme } from "@mui/material";
import { vec2 } from "gl-matrix";
import { scaleLinear } from "@visx/scale";
import { Axis, Orientation } from "@visx/axis";
import { LinearGradient } from "@visx/gradient";
import { LinePath, Line } from "@visx/shape";
import { Group } from "@visx/group";
import { Grid } from "@visx/grid";
import { Text } from "@visx/text";
import { GlyphCircle } from "@visx/glyph";
import { TooltipWithBounds, useTooltip, defaultStyles } from "@visx/tooltip";
import { localPoint } from "@visx/event";
import { RoadProfiles } from "@novorender/measure-api";

export const epsilon = 1e-3;

const getX = (d: [number, number]) => d[0];
const getY = (d: [number, number]) => d[1];

const margin = {
    top: 48,
    right: 32,
    bottom: 48,
    left: 48,
};

export function RoadProfileChart({
    profile,
    width: outerWidth,
    height: outerHeight,
}: {
    width: number;
    height: number;
    profile: RoadProfiles;
}) {
    const theme = useTheme();
    const {
        showTooltip,
        hideTooltip,
        tooltipData,
        tooltipTop = 0,
        tooltipLeft = 0,
    } = useTooltip<{ x: number; y: number }>();
    const innerWidth = Math.max(outerWidth - margin.left - margin.right, 0);
    const innerHeight = Math.max(outerHeight - margin.top - margin.bottom, 0);

    const centerLineIdx = 0;

    const lengths = useMemo(() => profile.intervals, [profile]);
    const heights = useMemo(() => profile.profiles[centerLineIdx].elevations, [profile]);
    const yMin = min(heights) ?? 0;
    const yMax = max(heights) ?? 0;
    const xMin = min(lengths) ?? 0;
    const xMax = max(lengths) ?? 0;

    const [xScale, yScale] = useMemo(() => {
        const _xScale = scaleLinear<number>({
            domain: [xMin, xMax],
            range: [0, innerWidth],
            nice: false,
        });

        const getYDomain = () => {
            const yLength = yMax - yMin;
            const xLength = Math.min(xMax - xMin, 100);

            if (yLength < xLength) {
                return [yMin - yLength * 0.15, yMax + yLength * 0.15];
            } else {
                return [yMin - Math.abs(yMin * 0.15), yMax + Math.abs(yMax * 0.15)];
            }
        };

        const _yScale = scaleLinear<number>({
            domain: getYDomain(),
            range: [innerHeight, 0],
            nice: false,
        });

        return [_xScale, _yScale];
    }, [innerHeight, innerWidth, xMax, xMin, yMax, yMin]);

    const handleTooltip = useCallback(
        (event: TouchEvent<SVGRectElement> | MouseEvent<SVGRectElement>) => {
            const { x } = localPoint(event) || { x: 0 };
            let x0 = xScale.invert(x - margin.left);

            if (x0 < xMin!) {
                x0 = xMin!;
            } else if (x0 > xMax!) {
                x0 = xMax!;
            }

            const index = bisectLeft(lengths, x0, 1);
            const pt0 = vec2.fromValues(
                profile.intervals[index - 1],
                profile.profiles[centerLineIdx].elevations[index - 1]
            );
            const pt1 = vec2.fromValues(profile.intervals[index], profile.profiles[centerLineIdx].elevations[index]);

            if (!pt0 || !pt1) {
                return;
            }

            const pt = vec2.lerp(vec2.create(), pt1, pt0, (pt1[0] - x0) / (pt1[0] - pt0[0])) as [number, number];
            const y = getY(pt);

            showTooltip({
                tooltipData: { x: x0, y: y },
                tooltipLeft: xScale(x0),
                tooltipTop: yScale(y),
            });
        },
        [showTooltip, yScale, xScale, lengths, profile, xMin, xMax]
    );

    return (
        <Box position="relative" sx={{ pointerEvents: "none" }}>
            <svg width={outerWidth} height={outerHeight}>
                <LinearGradient
                    id={"height-profile-chart-gradient"}
                    from={theme.palette.grey[100]}
                    to={theme.palette.grey[50]}
                    rotate={45}
                />
                <rect
                    x={0}
                    y={0}
                    width={outerWidth}
                    height={outerHeight}
                    fill={`url(#height-profile-chart-gradient)`}
                    rx={14}
                />
                <Group transform={`translate(${margin.left} ${margin.top})`}>
                    <Grid
                        xScale={xScale}
                        yScale={yScale}
                        width={innerWidth}
                        height={innerHeight}
                        stroke={theme.palette.grey[300]}
                    />
                    <rect
                        x={-10}
                        y={-10}
                        width={innerWidth + 20}
                        height={innerHeight + 20}
                        fill={`transparent`}
                        onTouchStart={handleTooltip}
                        onTouchMove={handleTooltip}
                        onMouseMove={handleTooltip}
                        onMouseLeave={() => hideTooltip()}
                        pointerEvents="auto"
                    />
                    {profile.profiles.map((p, profileIdx) => (
                        <LinePath<[number, number]>
                            data={p.elevations.map((e, i) => [profile.intervals[i], e])}
                            x={(d) => xScale(getX(d)) ?? 0}
                            y={(d) => yScale(getY(d)) ?? 0}
                            stroke={profileIdx === 0 ? "red" : theme.palette.secondary.main}
                            strokeWidth={2}
                            shapeRendering="geometricPrecision"
                        />
                    ))}

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
                        top={innerHeight}
                        scale={xScale}
                        numTicks={5}
                        tickLabelProps={() => ({
                            textAnchor: "middle",
                            fontFamily: "Roboto, sans-serif",
                            fontSize: 12,
                        })}
                    />
                    {profile.profiles[centerLineIdx].elevations.map((e, i, arr) => {
                        if (i === arr.length - 1) {
                            return null;
                        }

                        const pt = vec2.fromValues(profile.intervals[i], e);

                        const pt2 = vec2.fromValues(profile.intervals[i + 1], arr[i + 1]);

                        const dist = pt2[0] - pt[0];

                        const showGlyph = dist / xMax > 0.01 && i !== 0;
                        const showText = dist / xMax > 0.05;

                        if (!showGlyph && !showText) {
                            return null;
                        }

                        const rise = pt2[1] - pt[1];

                        const horizontal = Math.abs(rise) < epsilon;
                        const vertical = Math.abs(dist) < epsilon;

                        if (horizontal || vertical) {
                            return null;
                        }

                        const slope = rise / dist;

                        const yStart = yScale(pt[1]);
                        const yEnd = yScale(pt2[1]);
                        const scaledRise = yEnd - yStart;

                        const xStart = xScale(pt[0]);
                        const xEnd = xScale(pt2[0]);
                        const scaledDist = xEnd - xStart;

                        const yCenter = yScale(pt[1] + rise / 2);
                        const xCenter = xScale(pt[0] + dist / 2);
                        const scaledSlope = scaledRise / scaledDist;

                        return (
                            <Fragment key={i}>
                                {showGlyph ? (
                                    <GlyphCircle left={xStart} top={yStart} fill={theme.palette.secondary.dark} />
                                ) : null}
                                {showText ? (
                                    <Text
                                        y={yCenter}
                                        x={xCenter}
                                        fontSize={12}
                                        fontFamily="Roboto, sans-serif"
                                        dy={"-2em"}
                                        textAnchor="middle"
                                        angle={Math.atan(scaledSlope) * (180 / Math.PI)}
                                    >
                                        {Math.abs(slope * 100).toFixed(2) + " %"}
                                    </Text>
                                ) : null}
                            </Fragment>
                        );
                    })}
                    {tooltipData && (
                        <Group>
                            <Line
                                from={{ x: tooltipLeft, y: 0 }}
                                to={{ x: tooltipLeft, y: innerHeight }}
                                stroke={theme.palette.primary.light}
                                strokeOpacity={0.3}
                                strokeWidth={2}
                                strokeDasharray="5,2"
                            />
                            <circle
                                cx={tooltipLeft}
                                cy={tooltipTop}
                                r={5}
                                stroke={theme.palette.primary.main}
                                fill={theme.palette.primary.light}
                                strokeWidth={2}
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
                        <Typography>Length: {tooltipData.x.toFixed(3)}</Typography>
                        <Typography>Elevation: {tooltipData.y.toFixed(3)} m</Typography>
                    </TooltipWithBounds>
                </div>
            )}
        </Box>
    );
}
