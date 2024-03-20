import { css, styled } from "@mui/material";
import { vec2 } from "gl-matrix";
import { Fragment, SVGProps } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { areaActions, selectAreas } from "features/area";
import { pointLineActions, selectPointLines } from "features/pointLine";
import { Picker, renderActions } from "features/render";
import { explorerActions, selectEnabledWidgets } from "slices/explorer";

import { measureActions, selectMeasure } from "./measureSlice";

const basicStyle = () => css`
    cursor: pointer;
    pointer-events: bounding-box;
    filter: drop-shadow(3px 3px 2px rgba(0, 0, 0, 0.3));
`;

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

const InfoMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="24" height="24" fillOpacity={0} transform={"translate(88 88)"} />
            <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
                stroke="black"
                fill="#FFFFFF"
                transform={"translate(89 89)"}
            ></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(basicStyle);

const UndoMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="24" height="24" fillOpacity={0} transform={"translate(88 88)"} />
            <circle r="10" fill="#57B8FF" transform={"translate(100 100)"} />
            <path
                d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"
                stroke="black"
                fill="black"
                transform={"translate(93 93) scale(0.6)"}
            ></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(basicStyle);

const FinalizeMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="24" height="24" fillOpacity={0} transform={"translate(88 88)"} />
            <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                stroke="black"
                fill="#00F043"
                transform={"translate(88 88)"}
            ></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(basicStyle);

const ConnectMarker = styled(
    (props: SVGProps<SVGGElement>) => (
        <g {...props}>
            <rect width="24" height="24" fillOpacity={0} transform={"translate(88 88)"} />
            <circle r="10" fill="#fef65b" stroke="black" transform={"translate(100 100)"} />
            <path
                d="M19.5 9.5c-1.03 0-1.9.62-2.29 1.5h-2.92c-.39-.88-1.26-1.5-2.29-1.5s-1.9.62-2.29 1.5H6.79c-.39-.88-1.26-1.5-2.29-1.5C3.12 9.5 2 10.62 2 12s1.12 2.5 2.5 2.5c1.03 0 1.9-.62 2.29-1.5h2.92c.39.88 1.26 1.5 2.29 1.5s1.9-.62 2.29-1.5h2.92c.39.88 1.26 1.5 2.29 1.5 1.38 0 2.5-1.12 2.5-2.5s-1.12-2.5-2.5-2.5z"
                stroke="black"
                fill="black"
                transform={"translate(91.4 91.4) scale(0.7)"}
            ></path>
        </g>
    ),
    { shouldForwardProp: (prop) => prop !== "active" && prop !== "hovered" }
)(basicStyle);

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
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();
    const { selectedEntities } = useAppSelector(selectMeasure);
    const measure = useAppSelector(selectMeasure);
    const areas = useAppSelector(selectAreas);
    const pointLines = useAppSelector(selectPointLines);
    const widgetIsEnabled =
        useAppSelector(selectEnabledWidgets).find((widget) => widget.key === featuresConfig.measure.key) !== undefined;

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
                                {widgetIsEnabled && (
                                    <InfoMarker
                                        id={`infoMeasure-${idx}`}
                                        name={`infoMeasure-${idx}`}
                                        onClick={() => {
                                            dispatch(measureActions.selectMeasureSet(idx));
                                            dispatch(explorerActions.forceOpenWidget(featuresConfig.measure.key));
                                        }}
                                    />
                                )}
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
                                dispatch(areaActions.undoPt(view));
                            }}
                        />
                        <InfoMarker
                            id={`infoArea-${idx}`}
                            name={`infoArea-${idx}`}
                            onClick={() => {
                                dispatch(areaActions.setCurrentArea(idx));
                                dispatch(explorerActions.forceOpenWidget(featuresConfig.area.key));
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
                            <ConnectMarker
                                id={`connectPl-${idx}`}
                                name={`connectPl-${idx}`}
                                onClick={() => {
                                    dispatch(pointLineActions.connectPoints(view));
                                    dispatch(renderActions.stopPicker(Picker.PointLine));
                                    dispatch(pointLineActions.newPointLine());
                                }}
                            />
                            <UndoMarker
                                id={`undoPl-${idx}`}
                                name={`undoPl-${idx}`}
                                onClick={() => {
                                    dispatch(pointLineActions.undoPoint(view));
                                }}
                            />
                            <InfoMarker
                                id={`infoPl-${idx}`}
                                name={`infoPl-${idx}`}
                                onClick={() => {
                                    dispatch(pointLineActions.setCurrent(idx));
                                    dispatch(explorerActions.forceOpenWidget(featuresConfig.pointLine.key));
                                }}
                            />
                        </>
                    ) : null}
                </Fragment>
            ))}
        </>
    );
}
