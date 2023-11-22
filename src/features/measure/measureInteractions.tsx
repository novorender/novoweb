import { css, styled, Theme } from "@mui/material";
import { vec2 } from "gl-matrix";
import { Fragment, SVGProps } from "react";

import { useAppDispatch, useAppSelector } from "app/store";

import { measureActions, selectMeasure } from "./measureSlice";

const basicStyle = () => css`
    cursor: pointer;
    pointer-events: bounding-box;
    filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3));
`;

const markerStyles = ({ theme }: { theme: Theme }) => css`
    cursor: pointer;
    pointer-events: bounding-box;
    filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3));

    :hover {
        path {
            stroke: "black";
            fill: ${theme.palette.primary.light};
        }
    }
    path {
        stroke: "black";
        fill: ${theme.palette.primary.main};
    }
`;

const RemoveMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="15" height="15" fillOpacity={0} transform={"translate(100 100)"} />
            <circle r="8" fill="red" transform={"translate(100 100)"} />
            <path d="M96,96 L104,104 M104,96 L96,104" stroke="white" strokeWidth={2}></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(basicStyle);

const InfoMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="15" height="15" fillOpacity={0} transform={"translate(100 100)"} />
            <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                transform={"translate(90.4 90.4) scale(0.8)"}
            ></path>
            ;
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(markerStyles);

export type MeasureInteractionPositions = {
    remove: (vec2 | undefined)[];
    info: (vec2 | undefined)[];
    removeAxis: {
        x?: vec2;
        y?: vec2;
        z?: vec2;
        plan?: vec2;
        dist?: vec2;
        normal?: vec2;
    }[];
};

export function MeasureInteractions() {
    const dispatch = useAppDispatch();
    const { selectedEntities } = useAppSelector(selectMeasure);
    const measure = useAppSelector(selectMeasure);

    return (
        <>
            {selectedEntities.map((_, idx) => (
                <Fragment key={`measureSet-${idx}`}>
                    {
                        <>
                            <RemoveMarker
                                id={`removeMeasure-${idx}`}
                                name={`removeMeasure-${idx}`}
                                onClick={() => {
                                    dispatch(measureActions.deleteMeasureSet(idx));
                                }}
                            />
                            <InfoMarker
                                id={`infoMeasure-${idx}`}
                                name={`infoMeasure-${idx}`}
                                onClick={() => {
                                    dispatch(measureActions.selectMeasureSet(idx));
                                }}
                            />
                        </>
                    }
                </Fragment>
            ))}
            {measure.duoMeasurementValues.map((result, idx) => (
                <Fragment key={`measureResult-${idx}`}>
                    {result ? (
                        <>
                            <RemoveMarker
                                id={`removeMeasureResultX-${idx}`}
                                name={`removeMeasureResultX-${idx}`}
                                onClick={() => {
                                    dispatch(measureActions.removeAxis({ axis: "x", idx }));
                                }}
                            />
                            <RemoveMarker
                                id={`removeMeasureResultY-${idx}`}
                                name={`removeMeasureResultY-${idx}`}
                                onClick={() => {
                                    dispatch(measureActions.removeAxis({ axis: "y", idx }));
                                }}
                            />
                            <RemoveMarker
                                id={`removeMeasureResultZ-${idx}`}
                                name={`removeMeasureResultZ-${idx}`}
                                onClick={() => {
                                    dispatch(measureActions.removeAxis({ axis: "z", idx }));
                                }}
                            />
                            <RemoveMarker
                                id={`removeMeasureResultDist-${idx}`}
                                name={`removeMeasureResultDist-${idx}`}
                                onClick={() => {
                                    dispatch(measureActions.removeAxis({ axis: "dist", idx }));
                                }}
                            />
                            <RemoveMarker
                                id={`removeMeasureResultPlan-${idx}`}
                                name={`removeMeasureResultPlan-${idx}`}
                                onClick={() => {
                                    dispatch(measureActions.removeAxis({ axis: "plan", idx }));
                                }}
                            />
                            <RemoveMarker
                                id={`removeMeasureResultNormal-${idx}`}
                                name={`removeMeasureResultNormal-${idx}`}
                                onClick={() => {
                                    dispatch(measureActions.removeAxis({ axis: "normal", idx }));
                                }}
                            />
                        </>
                    ) : null}
                </Fragment>
            ))}
        </>
    );
}
