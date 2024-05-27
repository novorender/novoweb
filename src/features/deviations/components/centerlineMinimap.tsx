import { Box, css, styled } from "@mui/material";
import { LineSubject } from "@visx/annotation";
import { AxisBottom, AxisLeft } from "@visx/axis";
import { curveMonotoneX } from "@visx/curve";
import { LinearGradient } from "@visx/gradient";
import { GridRows } from "@visx/grid";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { scaleLinear } from "@visx/scale";
import { AreaClosed } from "@visx/shape";
import { useMemo, useState } from "react";

import { DeviationAggregateDistribution } from "apis/dataV2/deviationTypes";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { followPathActions, selectProfile } from "features/followPath";
import { useGoToProfile } from "features/followPath/useGoToProfile";
import { AsyncStatus } from "types/misc";
import { vecRgbaToRgbaString } from "utils/color";

import {
    selectCurrentSubprofileDeviationDistributions,
    selectSelectedProfile,
    selectSelectedSubprofile,
} from "../selectors";

export function CenterlineMinimap() {
    return (
        <div style={{ width: "100%", height: "80px" }}>
            <ParentSize>{({ width, height }) => <CenterlineMinimapInner width={width} height={height} />}</ParentSize>
        </div>
    );
}

const margin = { left: 32, top: 10, bottom: 26, right: 0 };

function CenterlineMinimapInner({ width, height }: { width: number; height: number }) {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const profile = useAppSelector(selectSelectedProfile);
    const subprofile = useAppSelector(selectSelectedSubprofile);
    const centerLine = subprofile?.centerLine;
    const fullParameterBounds = centerLine?.parameterBounds;
    const profilePos = useAppSelector(selectProfile);
    const goToProfile = useGoToProfile();
    const dispatch = useAppDispatch();
    const distribution = useAppSelector(selectCurrentSubprofileDeviationDistributions);
    const fullData =
        distribution?.data.status === AsyncStatus.Success ? distribution?.data.data.aggregatesAlongProfile : undefined;

    const [attr, setAttr] = useState("avgDistance" as keyof DeviationAggregateDistribution);

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

    const knots = useMemo(() => {
        if (!profile) {
            return [];
        }

        // const [min, max] = scaleY.domain();
        // const extent = max - min;
        const range = scaleY.range();
        const height = Math.abs(range[1] - range[0]);
        const opacity = 0.8;

        const stops = profile.colors.colorStops.map((cs, i) => {
            const color = vecRgbaToRgbaString(cs.color);
            const y = scaleY(cs.position);
            const offset = 100 - ((height - y) / height) * 100;
            // const offset = ((cs.position - min) / extent) * 100;
            return <stop key={i} offset={`${offset}%`} stopColor={color} stopOpacity={opacity}></stop>;
        });

        stops.push(
            <stop
                key="-1"
                offset="100%"
                stopColor={vecRgbaToRgbaString(profile.colors.colorStops.at(-1)!.color)}
                stopOpacity={opacity}
            ></stop>
        );

        return stops;
    }, [profile, scaleY]);

    if (!data) {
        return;
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
                    const pos = scaleX.invert(x);

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
                        keepCamera: true,
                    });
                }}
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
                <AreaClosed
                    data={data}
                    x={(d) => scaleX(d.profile) ?? 0}
                    y={(d) => scaleY(d[attr]) ?? 0}
                    yScale={scaleY}
                    strokeWidth={1}
                    stroke="url(#area-gradient)"
                    fill="url(#area-gradient)"
                    curve={curveMonotoneX}
                />
                {profilePos !== undefined ? (
                    <LineSubject
                        orientation={"vertical"}
                        stroke="#D61E5C"
                        x={scaleX(Number(profilePos))}
                        min={margin.top}
                        max={height - margin.bottom}
                    />
                ) : undefined}
                <AxisBottom top={height - margin.bottom} scale={scaleX} numTicks={4} />
                <AxisLeft left={margin.left} scale={scaleY} numTicks={2} />
            </svg>
            <Box position="absolute" top="0" right="0">
                <HeaderButton onClick={() => setAttr("minDistance")} active={attr === "minDistance"}>
                    min
                </HeaderButton>
                <HeaderButton onClick={() => setAttr("avgDistance")} active={attr === "avgDistance"}>
                    avg
                </HeaderButton>
                <HeaderButton onClick={() => setAttr("maxDistance")} active={attr === "maxDistance"}>
                    max
                </HeaderButton>
            </Box>
        </Box>
    );
}

const HeaderButton = styled("button", {
    shouldForwardProp: (prop) => prop !== "active",
})<React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & { active: boolean }>(
    ({ active }) => css`
        border: 0;
        opacity: 0.7;
        background: ${active ? "grey" : "transparent"};
    `
);
