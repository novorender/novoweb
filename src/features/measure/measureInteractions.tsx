import { css, styled } from "@mui/material";
import { vec2 } from "gl-matrix";
import { Fragment, SVGProps } from "react";

import { useAppDispatch, useAppSelector } from "app/store";

import { measureActions, selectMeasure } from "./measureSlice";

const basicStyle = () => css`
    cursor: pointer;
    pointer-events: bounding-box;
    filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3));
`;

const RemoveMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="24" height="24" fillOpacity={0} transform={"translate(100 100)"} />
            <circle r="8" fill="red" transform={"translate(100 100)"} />
            <path d="M96,96 L104,104 M104,96 L96,104" stroke="white" strokeWidth={2}></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(basicStyle);

export type MeasureInteractionPositions = {
    remove: (vec2 | undefined)[];
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
