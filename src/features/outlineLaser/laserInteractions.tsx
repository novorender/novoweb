import { css, styled, Theme } from "@mui/material";
import { Fragment, SVGProps } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { sleep } from "utils/time";

import { getOutlineLaser, OutlineLaser } from "./getOutlineLaser";
import { clippingOutlineLaserActions, selectOutlineLaserPlane, selectOutlineLasers } from "./outlineLaserSlice";

const markerStyles = ({ theme }: { theme: Theme }) => css`
    cursor: pointer;
    pointer-events: bounding-box;
    filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3));

    :hover {
        path {
            stroke: ${theme.palette.primary.light};
            fill: ${theme.palette.primary.light};
        }
    }
    path {
        stroke: ${theme.palette.primary.main};
        fill: ${theme.palette.primary.main};
    }
`;

const basicStyle = () => css`
    cursor: pointer;
    pointer-events: bounding-box;
    filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3));
`;

const ArrowMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="24" height="24" fillOpacity={0} transform={"translate(100 100)"} />
            <path d="M90 90 L100 100 L110 90"></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(markerStyles);

const RemoveMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="24" height="24" fillOpacity={0} transform={"translate(88 88)"} />
            <circle r="10" fill="red" transform={"translate(100 100)"} />
            <path d="M96,96 L104,104 M104,96 L96,104" stroke="white" strokeWidth={2}></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(basicStyle);

const UpdateMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="24" height="24" fillOpacity={0} transform={"translate(100 100)"} />
            <circle r="8" fill="white" transform={"translate(100 100)"} />
            <path
                d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                transform={"translate(90.4 90.4) scale(0.8)"}
            ></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(basicStyle);

export function ClippingTracerInteractions() {
    const {
        state: { view },
    } = useExplorerGlobals();

    const dispatch = useAppDispatch();
    const outlineLaser = useAppSelector(selectOutlineLasers);
    const plane = useAppSelector(selectOutlineLaserPlane);
    const updateTracer = async (idx: number) => {
        const trace = outlineLaser[idx];
        let newTrace: OutlineLaser | undefined;
        if (view) {
            if (trace.laserPlanes && trace.laserPlanes.length > 0) {
                view.modifyRenderState({
                    outlines: {
                        enabled: true,
                        hidden: true,
                        planes: trace.laserPlanes,
                    },
                });
                await sleep(1000);
                newTrace = await getOutlineLaser(
                    trace.laserPosition,
                    view,
                    "outline",
                    plane?.rotation ?? 0,
                    trace.laserPlanes,
                    1
                );
                view.modifyRenderState({
                    outlines: {
                        enabled: false,
                        hidden: true,
                        planes: [],
                    },
                });
            } else {
                if (plane) {
                    newTrace = await getOutlineLaser(trace.laserPosition, view, "clipping", plane?.rotation ?? 0, [
                        plane?.normalOffset,
                    ]);
                }
            }
        }

        if (newTrace) {
            if (trace.measurementX === undefined) {
                newTrace.measurementX = undefined;
            }
            if (trace.measurementY === undefined) {
                newTrace.measurementY = undefined;
            }
            if (trace.measurementZ === undefined) {
                newTrace.measurementZ = undefined;
            }
            dispatch(clippingOutlineLaserActions.setLaser({ idx, trace: newTrace }));
        }
    };

    return (
        <>
            {outlineLaser.map((trace, idx) => (
                <Fragment key={`tracer-${idx}`}>
                    {trace.measurementX ? (
                        <>
                            <ArrowMarker
                                id={`leftMarker-${idx}`}
                                name={`leftMarker-${idx}`}
                                onClick={() => {
                                    dispatch(clippingOutlineLaserActions.incrementLaserLeft(idx));
                                }}
                            />
                            <ArrowMarker
                                id={`rightMarker-${idx}`}
                                name={`rightMarker-${idx}`}
                                onClick={() => {
                                    dispatch(clippingOutlineLaserActions.incrementLaserRight(idx));
                                }}
                            />

                            {trace.measurementX.startIdx !== undefined ? (
                                <RemoveMarker
                                    id={`removeXTracer-${idx}`}
                                    name={`removeXTracer-${idx}`}
                                    onClick={() => {
                                        dispatch(clippingOutlineLaserActions.removeMeasurementX(idx));
                                    }}
                                />
                            ) : (
                                <UpdateMarker
                                    id={`updateXTracer-${idx}`}
                                    name={`updateXTracer-${idx}`}
                                    onClick={() => {
                                        updateTracer(idx);
                                    }}
                                />
                            )}
                        </>
                    ) : null}
                    {trace.measurementY ? (
                        <>
                            <ArrowMarker
                                id={`downMarker-${idx}`}
                                name={`downMarker-${idx}`}
                                onClick={() => {
                                    dispatch(clippingOutlineLaserActions.incrementLaserDown(idx));
                                }}
                            />
                            <ArrowMarker
                                id={`upMarker-${idx}`}
                                name={`upMarker-${idx}`}
                                onClick={() => {
                                    dispatch(clippingOutlineLaserActions.incrementLaserUp(idx));
                                }}
                            />
                            {trace.measurementY.startIdx !== undefined ? (
                                <RemoveMarker
                                    id={`removeYTracer-${idx}`}
                                    name={`removeYTracer-${idx}`}
                                    onClick={() => {
                                        dispatch(clippingOutlineLaserActions.removeMeasurementY(idx));
                                    }}
                                />
                            ) : (
                                <UpdateMarker
                                    id={`updateYTracer-${idx}`}
                                    name={`updateYTracer-${idx}`}
                                    onClick={() => {
                                        updateTracer(idx);
                                    }}
                                />
                            )}
                        </>
                    ) : null}
                    {trace.measurementZ ? (
                        <>
                            <ArrowMarker
                                id={`zDownMarker-${idx}`}
                                name={`zDownMarker-${idx}`}
                                onClick={() => {
                                    dispatch(clippingOutlineLaserActions.incrementLaserZDown(idx));
                                }}
                            />
                            <ArrowMarker
                                id={`zUpMarker-${idx}`}
                                name={`zUpMarker-${idx}`}
                                onClick={() => {
                                    dispatch(clippingOutlineLaserActions.incrementLaserZUp(idx));
                                }}
                            />
                            {trace.measurementZ.startIdx !== undefined ? (
                                <RemoveMarker
                                    id={`removeZTracer-${idx}`}
                                    name={`removeZTracer-${idx}`}
                                    onClick={() => {
                                        dispatch(clippingOutlineLaserActions.removeMeasurementZ(idx));
                                    }}
                                />
                            ) : (
                                <UpdateMarker
                                    id={`updateZTracer-${idx}`}
                                    name={`updateZTracer-${idx}`}
                                    onClick={() => {
                                        updateTracer(idx);
                                    }}
                                />
                            )}
                        </>
                    ) : null}
                </Fragment>
            ))}
        </>
    );
}
