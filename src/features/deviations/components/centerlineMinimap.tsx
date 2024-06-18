import { Box, css, styled } from "@mui/material";
import { LineSubject } from "@visx/annotation";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { localPoint } from "@visx/event";
import { LinearGradient } from "@visx/gradient";
import { GridRows } from "@visx/grid";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar, Line } from "@visx/shape";
import { defaultStyles, TooltipWithBounds, withTooltip } from "@visx/tooltip";
import { WithTooltipProvidedProps } from "@visx/tooltip/lib/enhancers/withTooltip";
import { bisector } from "@visx/vendor/d3-array";
import { useCallback, useMemo } from "react";

import { DeviationAggregateDistribution } from "apis/dataV2/deviationTypes";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { followPathActions, selectProfile } from "features/followPath";
import { useGoToProfile } from "features/followPath/useGoToProfile";
import { AsyncStatus } from "types/misc";

import { deviationsActions } from "../deviationsSlice";
import {
    selectCenterlineMinimapAttr,
    selectCurrentSubprofileDeviationDistributions,
    selectSelectedProfile,
    selectSelectedSubprofile,
} from "../selectors";
import { getColorKnots } from "./utils";

export function CenterlineMinimap() {
    return (
        <div style={{ width: "100%", height: "80px" }}>
            <ParentSize>{({ width, height }) => <CenterlineMinimapInner width={width} height={height} />}</ParentSize>
        </div>
    );
}

const bisectRange = bisector<DeviationAggregateDistribution, number>((d) => d.profile).left;
const tooltipStyles = {
    ...defaultStyles,
    border: "1px solid white",
};

const margin = { left: 44, top: 10, bottom: 26, right: 0 };

type Props = { width: number; height: number };

const CenterlineMinimapInner = withTooltip<Props, DeviationAggregateDistribution>(
    ({
        width,
        height,
        showTooltip,
        hideTooltip,
        tooltipData,
        tooltipTop = 0,
        tooltipLeft = 0,
    }: Props & WithTooltipProvidedProps<DeviationAggregateDistribution>) => {
        const {
            state: { view },
        } = useExplorerGlobals(true);
        const profile = useAppSelector(selectSelectedProfile);
        const subprofile = useAppSelector(selectSelectedSubprofile);
        const centerLine = subprofile?.centerLine;
        const fullParameterBounds = centerLine?.parameterBounds;
        const profilePos = useAppSelector(selectProfile);
        const profilePosNumber = Number(profilePos);
        const goToProfile = useGoToProfile();
        const dispatch = useAppDispatch();
        const distribution = useAppSelector(selectCurrentSubprofileDeviationDistributions);
        const attr = useAppSelector(selectCenterlineMinimapAttr);
        const fullData =
            distribution?.data.status === AsyncStatus.Success
                ? distribution?.data.data.aggregatesAlongProfile
                : undefined;

        const distributions = useAppSelector(selectCurrentSubprofileDeviationDistributions);

        const parameterBounds = useMemo(() => {
            return distributions?.parameterBounds ?? fullParameterBounds;
        }, [distributions, fullParameterBounds]);

        const data = useMemo(() => {
            if (!fullData || !parameterBounds) {
                return;
            }

            return fullData.filter((d) => d.profile >= parameterBounds[0] && d.profile <= parameterBounds[1]);
        }, [fullData, parameterBounds]);

        const scaleX = useMemo(() => {
            return scaleLinear({
                range: [margin.left, width - margin.right],
                domain: parameterBounds ?? [0, 100],
            });
        }, [parameterBounds, width]);

        const scaleBandX = useMemo(() => {
            const domain: number[] = [];
            const bounds = parameterBounds ? [Math.floor(parameterBounds[0]), Math.ceil(parameterBounds[1])] : [0, 100];
            for (let i = bounds[0]; i <= bounds[1]; i++) {
                domain.push(i);
            }

            return scaleBand({
                range: [margin.left, width - margin.right],
                domain,
            });
        }, [width, parameterBounds]);

        const scaleY = useMemo(() => {
            let min = Number.MAX_SAFE_INTEGER;
            let max = Number.MIN_SAFE_INTEGER;
            if (data && data.length > 0) {
                for (const point of data) {
                    const value = point[attr];
                    if (value < min) {
                        min = value;
                    }
                    if (value > max) {
                        max = value;
                    }
                }
            } else {
                min = 0;
                max = 1;
            }

            return scaleLinear({
                range: [height - margin.bottom, margin.top],
                domain: [Math.min(0, min), Math.max(0, max)],
            });
        }, [data, height, attr]);

        const knots = useMemo(() => getColorKnots(profile, scaleY), [profile, scaleY]);

        const handleHideTooltip = useCallback(() => {
            hideTooltip();
        }, [hideTooltip]);

        const handleTooltip = useCallback(
            (event: React.TouchEvent<SVGElement> | React.MouseEvent<SVGElement>) => {
                if (!data) {
                    return;
                }

                const { x } = localPoint(event) || { x: 0 };
                const x0 = scaleX.invert(x);
                const index = bisectRange(data, x0, 1);
                const d = data[index - 1];
                const barX = scaleBandX(d.profile);
                if (barX === undefined) {
                    return;
                }

                showTooltip({
                    tooltipData: d,
                    tooltipLeft: barX + scaleBandX.bandwidth() / 2,
                    tooltipTop: scaleY(d[attr]),
                });
            },
            [showTooltip, scaleY, scaleX, scaleBandX, data, attr]
        );

        if (!data) {
            return (
                <Box m={2} textAlign="center" color="grey">
                    Loading...
                </Box>
            );
        }

        return (
            <Box position="relative">
                <svg
                    width={width}
                    height={height}
                    onClick={async (e) => {
                        if (!centerLine) {
                            return;
                        }

                        const svg = (e.target as SVGElement).closest("svg") as SVGElement;
                        const bbox = svg.getBoundingClientRect();
                        const x = e.clientX - bbox.left;
                        const pos = Math.floor(scaleX.invert(x));

                        const fpObj = await view.measure?.followPath.followParametricObjects([centerLine.objectId], {
                            cylinderMeasure: "center",
                        });

                        if (!fpObj) {
                            return;
                        }

                        dispatch(followPathActions.setProfile(`${pos}`));
                        goToProfile({
                            fpObj,
                            p: pos,
                            keepOffset: true,
                        });
                    }}
                    onMouseMove={handleTooltip}
                    onMouseLeave={handleHideTooltip}
                >
                    <LinearGradient id="area-gradient">{knots}</LinearGradient>
                    <GridRows
                        scale={scaleY}
                        left={margin.left}
                        width={width - margin.left - margin.right}
                        strokeOpacity={0.5}
                        numTicks={2}
                        stroke="#e0e0e0"
                    />
                    <mask id="bar-mask">
                        {data
                            .map((d) => {
                                const barWidth = scaleBandX.bandwidth();
                                const y = scaleY(d[attr]);
                                if (!y) {
                                    return;
                                }

                                const barHeight = height - margin.bottom - y;
                                const barX = scaleBandX(d.profile);
                                const barY = height - margin.bottom - barHeight;
                                return (
                                    <Bar
                                        key={`bar-${d.profile}`}
                                        x={barX}
                                        y={barY}
                                        width={barWidth}
                                        height={barHeight}
                                        fill="white"
                                    />
                                );
                            })
                            .filter((e) => e)}
                    </mask>
                    <Bar
                        x={margin.left}
                        y={margin.top}
                        width={width - margin.right - margin.left}
                        height={height - margin.bottom - margin.top}
                        fill="url(#area-gradient)"
                        mask="url(#bar-mask)"
                    />
                    {!Number.isNaN(profilePosNumber) &&
                    data.length &&
                    profilePosNumber >= data[0].profile &&
                    profilePosNumber < data.at(-1)!.profile ? (
                        <LineSubject
                            orientation={"vertical"}
                            stroke="#D61E5C"
                            x={scaleBandX(profilePosNumber)! + scaleBandX.bandwidth() / 2}
                            min={margin.top}
                            max={height - margin.bottom}
                        />
                    ) : undefined}
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

                    <AxisBottom top={height - margin.bottom} scale={scaleX} numTicks={4} />
                    <text x={width - margin.right - 50} y={height - margin.bottom - 4} fontSize={10}>
                        Profile [m]
                    </text>
                    <AxisLeft left={margin.left} scale={scaleY} numTicks={2} />
                    <text transform={`translate(10, ${margin.top + 36}) rotate(-90)`} fontSize={10}>
                        Dev [m]
                    </text>
                </svg>
                <Box position="absolute" top="0" right="0">
                    <HeaderButton
                        onClick={() => dispatch(deviationsActions.setCenterlineMinimapAttr("minDistance"))}
                        active={attr === "minDistance"}
                    >
                        min
                    </HeaderButton>
                    <HeaderButton
                        onClick={() => dispatch(deviationsActions.setCenterlineMinimapAttr("avgDistance"))}
                        active={attr === "avgDistance"}
                    >
                        avg
                    </HeaderButton>
                    <HeaderButton
                        onClick={() => dispatch(deviationsActions.setCenterlineMinimapAttr("maxDistance"))}
                        active={attr === "maxDistance"}
                    >
                        max
                    </HeaderButton>
                </Box>
                {tooltipData && (
                    <div>
                        <TooltipWithBounds
                            key={Math.random()}
                            top={tooltipTop - 12}
                            left={tooltipLeft + 12}
                            style={tooltipStyles}
                        >
                            {tooltipData[attr].toFixed(3)} @ {tooltipData.profile.toFixed(0)}m
                        </TooltipWithBounds>
                    </div>
                )}
            </Box>
        );
    }
);

const HeaderButton = styled("button", {
    shouldForwardProp: (prop) => prop !== "active",
})<React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & { active: boolean }>(
    ({ active }) => css`
        border: 0;
        opacity: 0.7;
        background: ${active ? "grey" : "transparent"};
        cursor: pointer;
    `
);
