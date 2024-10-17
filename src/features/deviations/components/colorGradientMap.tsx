import { Box, ListItemText, Menu, MenuItem } from "@mui/material";
import { View } from "@novorender/api";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { Brush } from "@visx/brush";
import type BaseBrush from "@visx/brush/lib/BaseBrush";
import { type BrushHandleRenderProps } from "@visx/brush/lib/BrushHandle";
import { type Bounds } from "@visx/brush/lib/types";
import { curveMonotoneX } from "@visx/curve";
import { localPoint } from "@visx/event";
import { LinearGradient } from "@visx/gradient";
import { GridRows } from "@visx/grid";
import { Group } from "@visx/group";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { scaleLinear } from "@visx/scale";
import { Line, LinePath } from "@visx/shape";
import { defaultStyles, TooltipWithBounds, withTooltip } from "@visx/tooltip";
import { WithTooltipProvidedProps } from "@visx/tooltip/lib/enhancers/withTooltip";
import { bisector } from "@visx/vendor/d3-array";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PointCountAtDeviation } from "apis/dataV2/deviationTypes";
import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncStatus } from "types/misc";
import { clampColorGradientKnots, vecRgbaToRgbaString } from "utils/color";

import { UiDeviationProfile } from "../deviationTypes";
import {
    selectCurrentSubprofileDeviationDistributions,
    selectSelectedProfile,
    selectSelectedSubprofileIndex,
} from "../selectors";
import { accountForAbsValues } from "../utils";
import { ChartHeaderButton } from "./chartHeaderButton";

export function ColorGradientMap() {
    return (
        <div style={{ width: "100%", height: "140px" }}>
            <ParentSize>{({ width, height }) => <ColorGradientMapInner width={width} height={height} />}</ParentSize>
        </div>
    );
}

const margin = { left: 44, top: 10, bottom: 0, right: 0 };
const gradientMargin = { left: 44, top: 0, bottom: 4, right: 0 };
const gradientHeight = 24;
const bisectRange = bisector<PointCountAtDeviation, number>((d) => d.deviation).left;
const tooltipStyles = {
    ...defaultStyles,
    border: "1px solid white",
};
const defaultBrushPosition = undefined as
    | undefined
    | {
          start: { x: undefined | number };
          end: { x: undefined | number };
      };

type Props = { width: number; height: number };

export const ColorGradientMapInner = withTooltip<Props, PointCountAtDeviation>(
    ({
        width,
        height,
        showTooltip,
        hideTooltip,
        tooltipData,
        tooltipTop = 0,
        tooltipLeft = 0,
    }: Props & WithTooltipProvidedProps<PointCountAtDeviation>) => {
        const {
            state: { view },
        } = useExplorerGlobals(true);
        const subprofileIndex = useAppSelector(selectSelectedSubprofileIndex);
        const profile = useAppSelector(selectSelectedProfile);
        const distribution = useAppSelector(selectCurrentSubprofileDeviationDistributions);
        const [percentile, setPercentile] = useState(0.99);
        const fullData =
            distribution?.data.status === AsyncStatus.Success
                ? distribution?.data.data.pointCountAtDeviation
                : undefined;
        const [initialBrushPosition, setInitialBrushPosition] = useState(defaultBrushPosition);

        const brushRef = useRef<BaseBrush | null>(null);

        const expandedColorStops = useMemo(() => {
            if (!profile?.colors) {
                return [];
            }

            return profile.colors.absoluteValues
                ? accountForAbsValues(profile.colors.colorStops)
                : profile.colors.colorStops.toSorted((a, b) => a.position - b.position);
        }, [profile?.colors]);

        const data = useMemo(() => {
            if (!fullData || fullData.length === 0) {
                return;
            }

            let totalCount = 0;
            let maxCountAtIndex = 0;
            let maxCount = 0;
            fullData.forEach((p, i) => {
                totalCount += p.count;
                if (p.count > maxCount) {
                    maxCountAtIndex = i;
                    maxCount = p.count;
                }
            });

            let newData = fullData;

            if (percentile < 1) {
                const percentileTargetCount = Math.floor(totalCount * percentile);
                let percentileCount = fullData[maxCountAtIndex].count;
                // TODO start at maxCountAtIndex or at closest to deviation=0?
                // const pStartIndex = findItemIndexClosestTo(fullData, 0, (p) => p.deviation);
                const pStartIndex = maxCountAtIndex;

                let l = pStartIndex - 1;
                let r = pStartIndex + 1;
                while ((l >= 0 || r < fullData.length) && percentileCount <= percentileTargetCount) {
                    if (r >= fullData.length || (l >= 0 && fullData[l].count > fullData[r].count)) {
                        percentileCount += fullData[l].count;
                        l -= 1;
                    } else {
                        percentileCount += fullData[r].count;
                        r += 1;
                    }
                }

                newData = fullData.slice(l + 1, r);
            }

            const data = newData.map((p) => ({
                deviation: p.deviation,
                count: (p.count / totalCount) * 100 || 0,
            }));

            return data;
        }, [fullData, percentile]);

        useEffect(() => {
            setInitialBrushPosition(defaultBrushPosition);

            if (profile) {
                updateDeviationRange(view, profile, null);
            }
        }, [profile, subprofileIndex, view]);

        const scaleX = useMemo(() => {
            return scaleLinear({
                range: [margin.left, width - margin.right],
                domain: data && data.length ? [data[0].deviation, data.at(-1)!.deviation] : [0, 100],
            });
        }, [data, width]);

        const scaleY = useMemo(() => {
            let max = Number.MIN_SAFE_INTEGER;
            if (data && data.length > 0) {
                for (const point of data) {
                    const value = point.count;
                    if (value > max) {
                        max = value;
                    }
                }
            } else {
                max = 1;
            }

            return scaleLinear({
                range: [
                    height - margin.bottom - gradientHeight - gradientMargin.top - gradientMargin.bottom,
                    margin.top,
                ],
                domain: [0, Math.max(0, max)],
            });
        }, [data, height]);

        const brushScaleX = useMemo(() => {
            return scaleLinear({
                range: [0, width - margin.right - margin.left],
                domain: data && data.length ? [data[0].deviation, data.at(-1)!.deviation] : [0, 100],
            });
        }, [data, width]);

        const gradientColorStops = useMemo(() => {
            const domain = scaleX.domain();
            const extent = Math.abs(domain[1] - domain[0]);
            const opacity = 0.8;

            const stops = expandedColorStops.map((cs, i) => {
                const color = vecRgbaToRgbaString(cs.color);
                const offset = ((cs.position - domain[0]) / extent) * 100;
                return <stop key={i} offset={`${offset}%`} stopColor={color} stopOpacity={opacity}></stop>;
            });

            return stops;
        }, [expandedColorStops, scaleX]);

        const handleHideTooltip = useCallback(() => {
            hideTooltip();
        }, [hideTooltip]);

        const handleTooltip = useCallback(
            (event: React.TouchEvent<SVGRectElement> | React.MouseEvent<SVGRectElement>) => {
                if (!data) {
                    return;
                }

                const { x } = localPoint(event) || { x: 0 };
                const x0 = scaleX.invert(x);
                const index = bisectRange(data, x0, 1);
                const d0 = data[index - 1];
                const d = d0;

                showTooltip({
                    tooltipData: d,
                    tooltipLeft: x,
                    tooltipTop: scaleY(d.count),
                });
            },
            [showTooltip, scaleY, scaleX, data],
        );

        const reset = useCallback(() => {
            setInitialBrushPosition(defaultBrushPosition);
            if (profile) {
                updateDeviationRange(view, profile, null);
            }
        }, [profile, view]);

        const onBrushChange = useCallback(
            (domain: Bounds | null) => {
                if (!data || data.length === 0) {
                    return;
                }

                if (!domain) {
                    reset();
                } else {
                    let { x0, x1 } = domain;
                    if (x0 <= data[0].deviation + 0.001) {
                        x0 = data[0].deviation;
                    }
                    if (x1 >= data.at(-1)!.deviation - 0.001) {
                        x1 = data.at(-1)!.deviation;
                    }
                    setInitialBrushPosition({
                        start: { x: brushScaleX(x0) },
                        end: { x: brushScaleX(x1) },
                    });
                    if (profile) {
                        updateDeviationRange(view, profile, { start: x0, end: x1 });
                    }
                }
            },
            [view, reset, data, brushScaleX, profile],
        );

        useEffect(() => reset, [reset]);

        if (!data) {
            return (
                <Box m={2} textAlign="center" color="grey">
                    Loading...
                </Box>
            );
        }

        return (
            <Box position="relative">
                <svg width={width} height={height}>
                    <LinearGradient id="deviation-color-gradient" x1="0" y1="0" x2="1" y2="0">
                        {gradientColorStops}
                    </LinearGradient>
                    <rect
                        x={gradientMargin.left}
                        y={height - gradientMargin.bottom - gradientHeight}
                        width={Math.max(0, width - gradientMargin.left - gradientMargin.right)}
                        height={gradientHeight}
                        fill="url(#deviation-color-gradient)"
                    ></rect>
                    <GridRows
                        scale={scaleY}
                        left={margin.left}
                        width={Math.max(0, width - margin.left - margin.right)}
                        strokeOpacity={0.5}
                        numTicks={2}
                        stroke="#e0e0e0"
                    />
                    <LinePath
                        data={data}
                        x={(d) => scaleX(d.deviation) ?? 0}
                        y={(d) => scaleY(d.count) ?? 0}
                        stroke="#333"
                        strokeWidth={1}
                        curve={curveMonotoneX}
                    />
                    <Group left={margin.left} top={margin.top}>
                        <Brush
                            xScale={brushScaleX}
                            yScale={scaleY}
                            width={Math.max(0, width - margin.left - margin.right)}
                            height={Math.max(
                                0,
                                height -
                                    gradientHeight -
                                    margin.top -
                                    margin.bottom -
                                    gradientMargin.top -
                                    gradientMargin.bottom,
                            )}
                            initialBrushPosition={initialBrushPosition}
                            margin={margin}
                            handleSize={8}
                            innerRef={brushRef}
                            resizeTriggerAreas={["left", "right"]}
                            brushDirection="horizontal"
                            onChange={onBrushChange}
                            useWindowMoveEvents
                            renderBrushHandle={(props) => <BrushHandle {...props} />}
                            onMouseMove={handleTooltip}
                            onMouseLeave={handleHideTooltip}
                        />
                    </Group>
                    <AxisBottom
                        top={scaleY.range()[0]}
                        scale={scaleX}
                        numTicks={4}
                        tickValues={expandedColorStops
                            .filter((cs) => {
                                const [l, r] = scaleX.domain();
                                return cs.position >= l && cs.position <= r;
                            })
                            .map((cs) => cs.position)}
                        tickLabelProps={{
                            stroke: "#fff",
                        }}
                        tickFormat={(v) => v.toString()}
                    />
                    <text
                        x={width - margin.right - 38}
                        y={scaleY.range()[0] - 4}
                        fontSize={10}
                        style={{ pointerEvents: "none" }}
                    >
                        Dev [m]
                    </text>
                    <AxisLeft left={margin.left} scale={scaleY} numTicks={2} tickFormat={(v) => `${v}%`} />
                    <text
                        transform={`translate(10, ${margin.top + 40}) rotate(-90)`}
                        fontSize={10}
                        style={{ pointerEvents: "none" }}
                    >
                        Distr [%]
                    </text>
                    {tooltipData && (
                        <g>
                            <Line
                                from={{ x: tooltipLeft, y: margin.top }}
                                to={{ x: tooltipLeft, y: innerHeight + margin.top }}
                                stroke="#D61E5C"
                                strokeWidth={2}
                                pointerEvents="none"
                                strokeDasharray="5,2"
                            />
                            <circle
                                cx={tooltipLeft}
                                cy={tooltipTop + 1}
                                r={4}
                                fill="black"
                                fillOpacity={0.1}
                                stroke="black"
                                strokeOpacity={0.1}
                                strokeWidth={2}
                                pointerEvents="none"
                            />
                            <circle
                                cx={tooltipLeft}
                                cy={tooltipTop}
                                r={4}
                                fill="#D61E5C"
                                stroke="white"
                                strokeWidth={2}
                                pointerEvents="none"
                            />
                        </g>
                    )}
                </svg>
                {tooltipData && (
                    <div>
                        <TooltipWithBounds
                            key={Math.random()}
                            top={tooltipTop - 12}
                            left={tooltipLeft + 12}
                            style={tooltipStyles}
                        >
                            {`${tooltipData.count.toFixed(3)}%`} @ {tooltipData.deviation.toFixed(3)}m
                        </TooltipWithBounds>
                    </div>
                )}
                <Box position="absolute" top="0" right="0">
                    <ChartHeaderButton
                        onClick={() => {
                            reset();
                            brushRef.current?.reset();
                        }}
                        disabled={!initialBrushPosition}
                    >
                        Reset
                    </ChartHeaderButton>
                </Box>
                <Box position="absolute" top="20px" right="0">
                    <PercentileSelect
                        percentile={percentile}
                        setPercentile={(p) => {
                            setPercentile(p);
                            reset();
                            brushRef.current?.reset();
                        }}
                    />
                </Box>
            </Box>
        );
    },
);

function PercentileSelect({ percentile, setPercentile }: { percentile: number; setPercentile: (v: number) => void }) {
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const openMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const handleSelect = (p: number) => {
        closeMenu();
        setPercentile(p);
    };

    const getLabel = (p: number) => {
        switch (p) {
            case 1:
                return "show all";
            case 0.99:
                return "p99";
            case 0.95:
                return "p95";
        }
    };

    return (
        <>
            <ChartHeaderButton onClick={openMenu}>{getLabel(percentile)}</ChartHeaderButton>
            <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={closeMenu}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right",
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                }}
            >
                {[1, 0.99, 0.95].map((p) => (
                    <MenuItem key={p} selected={percentile === p} onClick={() => handleSelect(p)}>
                        <ListItemText>{getLabel(p)}</ListItemText>
                    </MenuItem>
                ))}
            </Menu>
        </>
    );
}

// We need to manually offset the handles for them to be rendered at the right position
function BrushHandle({ x, height, isBrushActive }: BrushHandleRenderProps) {
    const pathWidth = 8;
    const pathHeight = 15;
    if (!isBrushActive) {
        return null;
    }
    return (
        <Group left={x + pathWidth / 2} top={(height - pathHeight) / 2}>
            <path
                fill="#f2f2f2"
                d="M -4.5 0.5 L 3.5 0.5 L 3.5 15.5 L -4.5 15.5 L -4.5 0.5 M -1.5 4 L -1.5 12 M 0.5 4 L 0.5 12"
                stroke="#999999"
                strokeWidth="1"
                style={{ cursor: "ew-resize" }}
            />
        </Group>
    );
}

function updateDeviationRange(view: View, profile: UiDeviationProfile, pos: { start: number; end: number } | null) {
    const baseKnots = profile.colors.absoluteValues
        ? accountForAbsValues(profile.colors.colorStops)
        : profile.colors.colorStops.toSorted((a, b) => a.position - b.position);
    const knots = pos ? clampColorGradientKnots(baseKnots, pos.start, pos.end) : baseKnots;
    const colorGradients = view.renderState.points.deviation.colorGradients.slice();
    colorGradients[profile.index] = { knots };
    view.modifyRenderState({ points: { deviation: { colorGradients } } });
}
