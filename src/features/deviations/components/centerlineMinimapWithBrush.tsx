import { Box } from "@mui/material";
import { skipToken } from "@reduxjs/toolkit/query";
import { LineSubject } from "@visx/annotation";
import { Brush } from "@visx/brush";
import BaseBrush, { BaseBrushState } from "@visx/brush/lib/BaseBrush";
import { type BrushHandleRenderProps } from "@visx/brush/lib/BrushHandle";
import { type Bounds } from "@visx/brush/lib/types";
import { curveMonotoneX } from "@visx/curve";
import { LinearGradient } from "@visx/gradient";
import { Group } from "@visx/group";
import ParentSize from "@visx/responsive/lib/components/ParentSize";
import { scaleLinear } from "@visx/scale";
import { AreaClosed } from "@visx/shape";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useGetDeviationDistributionQuery } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { selectProfile } from "features/followPath";
import { useSceneId } from "hooks/useSceneId";
import { AsyncStatus } from "types/misc";

import { deviationsActions } from "../deviationsSlice";
import {
    selectCenterlineMinimapAttr,
    selectCurrentSubprofileDeviationDistributions,
    selectSelectedProfile,
    selectSelectedProfileId,
    selectSelectedSubprofile,
} from "../selectors";
import { getColorKnots } from "./utils";

export function CenterlineMinimapWithBrush() {
    return (
        <div style={{ width: "100%", height: "60px" }}>
            <ParentSize>
                {({ width, height }) => <CenterlineMinimapWithBrushInner width={width} height={height} />}
            </ParentSize>
        </div>
    );
}

const margin = { left: 8, top: 12, bottom: 12, right: 8 };

function CenterlineMinimapWithBrushInner({ width, height }: { width: number; height: number }) {
    const projectId = useSceneId();
    const profileId = useAppSelector(selectSelectedProfileId);
    const profile = useAppSelector(selectSelectedProfile);
    const subprofile = useAppSelector(selectSelectedSubprofile);
    const centerLine = subprofile?.centerLine;
    const fullParameterBounds = centerLine?.parameterBounds;
    const profilePos = useAppSelector(selectProfile);
    const dispatch = useAppDispatch();
    const attr = useAppSelector(selectCenterlineMinimapAttr);

    const { data: resp } = useGetDeviationDistributionQuery(
        projectId && profileId && subprofile?.centerLine?.brepId && fullParameterBounds
            ? {
                  projectId,
                  profileId,
                  centerLineId: subprofile.centerLine.brepId,
                  start: fullParameterBounds[0],
                  end: fullParameterBounds[1],
              }
            : skipToken
    );

    const data = resp?.aggregatesAlongProfile;

    const distributions = useAppSelector(selectCurrentSubprofileDeviationDistributions);

    const brushRef = useRef<BaseBrush | null>(null);

    const scaleX = useMemo(() => {
        return scaleLinear({
            range: [margin.left, width - margin.right],
            domain: fullParameterBounds ?? [0, 100],
        });
    }, [fullParameterBounds, width]);

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

    const brushScaleX = useMemo(() => {
        return scaleLinear({
            range: [0, width - margin.right - margin.left],
            domain: fullParameterBounds ?? [0, 100],
        });
    }, [fullParameterBounds, width]);

    const [initialBrushPosition, setInitialBrushPosition] = useState(
        getInitialBrushPosition(brushScaleX, fullParameterBounds, distributions?.parameterBounds)
    );

    useEffect(() => {
        const brushPos = getInitialBrushPosition(brushScaleX, fullParameterBounds, distributions?.parameterBounds);
        setInitialBrushPosition(brushPos);
        if (typeof brushPos.start.x === "number") {
            brushRef.current?.updateBrush((prevBrush) => {
                const newExtent = brushRef.current!.getExtent(brushPos.start, brushPos.end);

                const newState: BaseBrushState = {
                    ...prevBrush,
                    start: { y: newExtent.y0, x: newExtent.x0 },
                    end: { y: newExtent.y1, x: newExtent.x1 },
                    extent: newExtent,
                };

                return newState;
            });
        } else {
            brushRef.current?.reset();
        }
    }, [fullParameterBounds, distributions?.parameterBounds, brushScaleX]);

    const knots = useMemo(() => getColorKnots(profile, scaleY), [profile, scaleY]);

    const onBrushEnd = useCallback(
        (domain: Bounds | null) => {
            if (!fullParameterBounds) {
                return;
            }
            const [min, max] = fullParameterBounds;

            if (!domain) {
                dispatch(
                    deviationsActions.setSubprofileDeviationDistributions({
                        parameterBounds: fullParameterBounds,
                        data: { status: AsyncStatus.Initial },
                    })
                );
            } else {
                let { x0, x1 } = domain;

                // For some reason visx extends the range by 2px (SAFE_PIXEL), so brush grows a little
                // I left a comment here https://github.com/airbnb/visx/issues/1789#issuecomment-2162744965
                // Here we undo that damage. Hopefull temporary workaround
                x0 = brushScaleX.invert(brushScaleX(x0) + 2);
                x1 = brushScaleX.invert(brushScaleX(x1) - 2);

                if (x0 <= min + 1) {
                    x0 = min;
                }
                if (x1 >= max - 1) {
                    x1 = max;
                }
                x0 = Math.floor(x0);
                x1 = Math.ceil(x1);
                dispatch(
                    deviationsActions.setSubprofileDeviationDistributions({
                        parameterBounds: x0 >= x1 ? fullParameterBounds : [x0, x1],
                        data: { status: AsyncStatus.Initial },
                    })
                );
            }
        },
        [fullParameterBounds, dispatch, brushScaleX]
    );

    if (!data) {
        return;
    }

    return (
        <Box position="relative">
            <svg width={width} height={height}>
                <LinearGradient id="area-gradient">{knots}</LinearGradient>
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
                <Group left={margin.left} top={margin.top}>
                    <Brush
                        xScale={brushScaleX}
                        yScale={scaleY}
                        width={width - margin.left - margin.right}
                        height={height - margin.top - margin.bottom}
                        initialBrushPosition={initialBrushPosition}
                        margin={margin}
                        handleSize={8}
                        innerRef={brushRef}
                        resizeTriggerAreas={["left", "right"]}
                        brushDirection="horizontal"
                        onBrushEnd={onBrushEnd}
                        useWindowMoveEvents
                        renderBrushHandle={(props) => <BrushHandle {...props} />}
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
            </svg>
        </Box>
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

function getInitialBrushPosition(
    scale: ReturnType<typeof scaleLinear<number>>,
    fullBounds: [number, number] | undefined,
    bounds: [number, number] | undefined
) {
    if (
        bounds &&
        fullBounds &&
        Math.abs(bounds[0] - fullBounds[0]) < 0.1 &&
        Math.abs(bounds[1] - fullBounds[1]) < 0.1
    ) {
        bounds = undefined;
    }
    const [min, max] = bounds ? [scale(bounds[0]), scale(bounds[1])] : [undefined, undefined];
    return {
        start: { x: min },
        end: { x: max },
    };
}
