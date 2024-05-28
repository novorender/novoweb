import { Box, css, styled } from "@mui/material";
import { LineSubject } from "@visx/annotation";
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
import { selectProfile } from "features/followPath";
import { AsyncStatus } from "types/misc";
import { vecRgbaToRgbaString } from "utils/color";

import {
    selectCurrentSubprofileDeviationDistributions,
    selectSelectedProfile,
    selectSelectedProfileId,
    selectSelectedSubprofileIndex,
} from "../selectors";
import { accountForAbsValues } from "../utils";

export function ColorGradientMap() {
    return (
        <div style={{ width: "100%", height: "80px" }}>
            <ParentSize>{({ width, height }) => <ColorGradientMapInner width={width} height={height} />}</ParentSize>
        </div>
    );
}

const margin = { left: 32, top: 10, bottom: 0, right: 0 };
const gradientMargin = { left: 32, top: 0, bottom: 4, right: 0 };
const gradientHeight = 24;
const bisectRange = bisector<PointCountAtDeviation, number>((d) => d.deviation).left;
const tooltipStyles = {
    ...defaultStyles,
    border: "1px solid white",
};
const defaultBrushPosition = {
    start: { x: undefined as undefined | number },
    end: { x: undefined as undefined | number },
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
        const profileId = useAppSelector(selectSelectedProfileId);
        const subprofileIndex = useAppSelector(selectSelectedSubprofileIndex);
        const profile = useAppSelector(selectSelectedProfile);
        const profilePos = useAppSelector(selectProfile);
        const distribution = useAppSelector(selectCurrentSubprofileDeviationDistributions);
        const fullData =
            distribution?.data.status === AsyncStatus.Success
                ? distribution?.data.data.pointCountAtDeviation
                : undefined;
        const [initialBrushPosition, setInitialBrushPosition] = useState(defaultBrushPosition);

        const brushRef = useRef<BaseBrush | null>(null);

        const colorStops = profile?.colors.colorStops;

        const data = useMemo(() => {
            if (!fullData || !profile) {
                return;
            }

            const colorStops = profile.colors.absoluteValues
                ? accountForAbsValues(profile.colors.colorStops)
                : profile.colors.colorStops;

            const minDeviation = Math.min(...colorStops.map((cs) => cs.position));
            const maxDeviation = Math.max(...colorStops.map((cs) => cs.position));
            const offset = Math.max(0.1, (maxDeviation - minDeviation) * 0.1);
            const absMin = Number((minDeviation - offset).toFixed(1));
            const absMax = Number((maxDeviation + offset).toFixed(1));

            const newData: typeof fullData = [];
            let absMinCount = 0;
            let absMaxCount = 0;
            for (const p of fullData) {
                if (p.deviation <= absMin) {
                    absMinCount += p.count;
                } else if (p.deviation >= absMax) {
                    absMaxCount += p.count;
                } else {
                    newData.push(p);
                }
            }

            newData.unshift({ count: absMinCount, deviation: absMin });
            newData.push({ count: absMaxCount, deviation: absMax });

            const total = newData.reduce((acc, n) => acc + n.count, 0);
            return newData.map((p) => ({
                deviation: p.deviation,
                count: (p.count / total) * 100 || 0,
            }));
        }, [fullData, profile]);

        useEffect(() => {
            setInitialBrushPosition(defaultBrushPosition);
        }, [profileId, subprofileIndex]);

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
            if (!colorStops) {
                return [];
            }

            const domain = scaleX.domain();
            const extent = Math.abs(domain[1] - domain[0]);
            const opacity = 0.8;

            const stops = colorStops.toReversed().map((cs, i) => {
                const color = vecRgbaToRgbaString(cs.color);
                const offset = ((cs.position - domain[0]) / extent) * 100;
                return <stop key={i} offset={`${offset}%`} stopColor={color} stopOpacity={opacity}></stop>;
            });

            return stops;
        }, [colorStops, scaleX]);

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

                // view.modifyRenderState({ points: { deviation: { window: [d.deviation - 0.1, d.deviation + 0.1] } } });
            },
            [showTooltip, scaleY, scaleX, data]
        );

        const reset = useCallback(() => {
            setInitialBrushPosition(defaultBrushPosition);
            view.modifyRenderState({ points: { deviation: { visibleRange: [-100, 100] } } });
        }, [view]);

        const onBrushChange = useCallback(
            (domain: Bounds | null) => {
                if (!data || data.length === 0) {
                    return;
                }

                if (!domain) {
                    reset();
                } else {
                    let { x0, x1 } = domain;
                    if (Math.abs(x0 - data[0].deviation) < 0.01) {
                        x0 = -100;
                    }
                    if (Math.abs(x1 - data.at(-1)!.deviation) < 0.01) {
                        x1 = 100;
                    }
                    setInitialBrushPosition({
                        start: { x: brushScaleX(x0) },
                        end: { x: brushScaleX(x1) },
                    });
                    view.modifyRenderState({ points: { deviation: { visibleRange: [x0, x1] } } });
                }
            },
            [view, reset, data, brushScaleX]
        );

        useEffect(() => reset, [reset]);

        if (!data) {
            return;
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
                        width={width - gradientMargin.left - gradientMargin.right}
                        height={gradientHeight}
                        fill="url(#deviation-color-gradient)"
                    ></rect>
                    <GridRows
                        scale={scaleY}
                        left={margin.left}
                        width={width - margin.left - margin.right}
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
                            width={width - margin.left - margin.right}
                            height={
                                height -
                                gradientHeight -
                                margin.top -
                                margin.bottom -
                                gradientMargin.top -
                                gradientMargin.bottom
                            }
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
                    {profilePos !== undefined ? (
                        <LineSubject
                            orientation={"vertical"}
                            stroke="#D61E5C"
                            x={scaleX(Number(profilePos))}
                            min={margin.top}
                            max={height - margin.bottom}
                        />
                    ) : undefined}
                    <AxisBottom
                        top={scaleY.range()[0]}
                        scale={scaleX}
                        numTicks={4}
                        tickValues={profile?.colors.colorStops.map((cs) => cs.position)}
                        tickLabelProps={{
                            stroke: "#fff",
                        }}
                    />
                    <AxisLeft left={margin.left} scale={scaleY} numTicks={2} tickFormat={(v) => `${v}%`} />
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
                            {`${tooltipData.count.toFixed(3)}%`} @ {tooltipData.deviation.toFixed(2)}
                        </TooltipWithBounds>
                    </div>
                )}
                <Box position="absolute" top="0" right="0">
                    <HeaderButton
                        onClick={() => {
                            reset();
                            brushRef.current?.reset();
                        }}
                    >
                        Reset
                    </HeaderButton>
                </Box>
            </Box>
        );
    }
);

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

const HeaderButton = styled("button", {
    shouldForwardProp: (prop) => prop !== "active",
})<React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & { active?: boolean }>(
    ({ active }) => css`
        border: 0;
        opacity: 0.7;
        background: ${active ? "grey" : "transparent"};
    `
);
