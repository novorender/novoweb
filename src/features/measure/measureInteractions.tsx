import { css, styled, Theme } from "@mui/material";
import { vec2 } from "gl-matrix";
import { Fragment, SVGProps } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { areaActions, selectAreas } from "features/area";
import { pointLineActions, selectPointLines } from "features/pointLine";
import { Picker, renderActions } from "features/render";

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

const UndoMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="15" height="15" fillOpacity={0} transform={"translate(100 100)"} />
            <path
                d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"
                transform={"translate(90.4 90.4) scale(0.8)"}
            ></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(markerStyles);

const FinalizeMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="15" height="15" fillOpacity={0} transform={"translate(100 100)"} />
            <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                transform={"translate(90.4 90.4) scale(0.8)"}
            ></path>
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
    area: {
        remove: (vec2 | undefined)[];
        finalize: (vec2 | undefined)[];
        undo: (vec2 | undefined)[];
    };
    pointLine: {
        remove: (vec2 | undefined)[];
        finalize: (vec2 | undefined)[];
        undo: (vec2 | undefined)[];
    };
};

export function MeasureInteractions() {
    const dispatch = useAppDispatch();
    const { selectedEntities } = useAppSelector(selectMeasure);
    const measure = useAppSelector(selectMeasure);
    const areas = useAppSelector(selectAreas);
    const pointLines = useAppSelector(selectPointLines);

    return (
        <>
            {selectedEntities.map((entities, idx) =>
                entities.length ? (
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
                ) : null
            )}
            {measure.duoMeasurementValues.map((result, idx) =>
                result ? (
                    <Fragment key={`measureResult-${idx}`}>
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
                    </Fragment>
                ) : null
            )}
            {areas.map((area, idx) =>
                area.points.length && area.area !== -1 ? (
                    <Fragment key={`area-${idx}`}>
                        <RemoveMarker
                            id={`removeArea-${idx}`}
                            name={`removeArea-${idx}`}
                            onClick={() => {
                                dispatch(renderActions.stopPicker(Picker.Area));
                                dispatch(areaActions.deleteArea(idx));
                            }}
                        />
                        <FinalizeMarker
                            id={`finalizeArea-${idx}`}
                            name={`finalizeArea-${idx}`}
                            onClick={() => {
                                dispatch(renderActions.stopPicker(Picker.Area));
                                dispatch(areaActions.newArea());
                            }}
                        />
                        <UndoMarker
                            id={`undoArea-${idx}`}
                            name={`undoArea-${idx}`}
                            onClick={() => {
                                dispatch(areaActions.undoPoint());
                            }}
                        />
                    </Fragment>
                ) : null
            )}

            {pointLines.map((pointLine, idx) => (
                <Fragment key={`area-${idx}`}>
                    {pointLine.points.length ? (
                        <>
                            <RemoveMarker
                                id={`removePl-${idx}`}
                                name={`removePl-${idx}`}
                                onClick={() => {
                                    dispatch(renderActions.stopPicker(Picker.PointLine));
                                    dispatch(pointLineActions.deletePointline(idx));
                                }}
                            />
                            <FinalizeMarker
                                id={`finalizePl-${idx}`}
                                name={`finalizePl-${idx}`}
                                onClick={() => {
                                    dispatch(renderActions.stopPicker(Picker.PointLine));
                                    dispatch(pointLineActions.newPointLine());
                                }}
                            />
                            <UndoMarker
                                id={`undoPl-${idx}`}
                                name={`undoPl-${idx}`}
                                onClick={() => {
                                    dispatch(pointLineActions.undoPoint());
                                }}
                            />
                        </>
                    ) : null}
                </Fragment>
            ))}
        </>
    );
}
