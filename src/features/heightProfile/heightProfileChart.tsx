import { Box, Typography, useTheme } from "@mui/material";
import { Axis, Orientation } from "@visx/axis";
import { localPoint } from "@visx/event";
import { GlyphCircle } from "@visx/glyph";
import { LinearGradient } from "@visx/gradient";
import { Grid } from "@visx/grid";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";
import { Line, LinePath } from "@visx/shape";
import { Text } from "@visx/text";
import { defaultStyles, TooltipWithBounds, useTooltip } from "@visx/tooltip";
import { bisectLeft, max, min } from "d3-array";
import { vec2 } from "gl-matrix";
import { Fragment, MouseEvent, TouchEvent, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";

export const epsilon = 1e-3;

const getX = (d: Vec2) => d[0];
const getY = (d: Vec2) => d[1];

const margin = {
    top: 48,
    right: 32,
    bottom: 48,
    left: 48,
};

export function HeightProfileChart({
    pts,
    width: outerWidth,
    height: outerHeight,
}: {
    width: number;
    height: number;
    pts: Vec2[];
}) {
    const { t } = useTranslation();
    const theme = useTheme();
    const {
        showTooltip,
        hideTooltip,
        tooltipData,
        tooltipTop = 0,
        tooltipLeft = 0,
    } = useTooltip<{ x: number; y: number; slope: number }>();
    const innerWidth = Math.max(outerWidth - margin.left - margin.right, 0);
    const innerHeight = Math.max(outerHeight - margin.top - margin.bottom, 0);

    const lengths = useMemo(() => pts.map(getX), [pts]);
    const heights = useMemo(() => pts.map(getY), [pts]);
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
                const d = xLength - yLength;

                return [yMin - d / 2, yMax + d / 2];
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
            const pt0 = pts[index - 1];
            const pt1 = pts[index];

            if (!pt0 || !pt1) {
                return;
            }

            const pt = vec2.lerp(vec2.create(), pt1, pt0, (getX(pt1) - x0) / (getX(pt1) - getX(pt0))) as [
                number,
                number,
            ];
            const rise = getY(pt1) - getY(pt0);
            const dist = getX(pt1) - getX(pt0);

            const y = getY(pt);

            showTooltip({
                tooltipData: { x: x0, y: y, slope: Math.abs((rise / dist) * 100) },
                tooltipLeft: xScale(x0),
                tooltipTop: yScale(y),
            });
        },
        [showTooltip, yScale, xScale, lengths, pts, xMin, xMax],
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
                    <LinePath<Vec2>
                        data={pts}
                        x={(d) => xScale(getX(d)) ?? 0}
                        y={(d) => yScale(getY(d)) ?? 0}
                        stroke={theme.palette.secondary.main}
                        strokeWidth={2}
                        shapeRendering="geometricPrecision"
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
                        top={innerHeight}
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

                        const showGlyph = dist / xMax > 0.01 && i !== 0;
                        const showText = dist / xMax > 0.05;

                        if (!showGlyph && !showText) {
                            return null;
                        }

                        const rise = getY(pt2) - getY(pt);

                        const horizontal = Math.abs(rise) < epsilon;
                        const vertical = Math.abs(dist) < epsilon;

                        if (horizontal || vertical) {
                            return null;
                        }

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
                        <Typography>
                            {t("lengthName")}
                            {tooltipData.x.toFixed(3)}
                        </Typography>
                        <Typography>
                            {t("elevationName")}
                            {tooltipData.y.toFixed(3)} m
                        </Typography>
                        <Typography>
                            {t("slopeName")}
                            {tooltipData.slope.toFixed(2)}% m
                        </Typography>
                    </TooltipWithBounds>
                </div>
            )}
        </Box>
    );
}
