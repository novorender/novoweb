import { mat3, mat4, quat, vec3, vec4 } from "gl-matrix";
import { MouseEventHandler, useRef } from "react";
import { OrthoControllerParams } from "@novorender/webgl-api";

import { api, measureApi } from "app";
import {
    renderActions,
    selectClippingBox,
    selectMainObject,
    selectSelectMultiple,
    CameraType,
    selectCamera,
    selectPicker,
    Picker,
    selectViewMode,
    selectSecondaryHighlightProperty,
} from "features/render/renderSlice";
import { selectDeviations } from "features/deviations";
import { measureActions, selectMeasure, useMeasurePickSettings } from "features/measure";
import { manholeActions } from "features/manhole";
import { useAppDispatch, useAppSelector } from "app/store";
import { followPathActions } from "features/followPath";
import { areaActions } from "features/area";
import { heightProfileActions } from "features/heightProfile";
import { pointLineActions } from "features/pointLine";
import { ExtendedMeasureEntity, ViewMode } from "types/misc";
import { orthoCamActions, selectCrossSectionPoint } from "features/orthoCam";
import { useAbortController } from "hooks/useAbortController";

import { useHighlighted, highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
    useHighlightCollections,
} from "contexts/highlightCollections";

import { pickDeviationArea } from "./utils";

export function useCanvasClickHandler() {
    const dispatch = useAppDispatch();
    const highlightedObjects = useHighlighted();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const highlightCollections = useHighlightCollections();
    const {
        state: { view, scene, canvas, measureScene },
    } = useExplorerGlobals();

    const mainObject = useAppSelector(selectMainObject);
    const selectMultiple = useAppSelector(selectSelectMultiple);
    const clippingBox = useAppSelector(selectClippingBox);
    const cameraState = useAppSelector(selectCamera);
    const measure = useAppSelector(selectMeasure);
    const deviation = useAppSelector(selectDeviations);
    const picker = useAppSelector(selectPicker);
    const measurePickSettings = useMeasurePickSettings();
    const crossSectionPoint = useAppSelector(selectCrossSectionPoint);
    const viewMode = useAppSelector(selectViewMode);

    const [secondaryHighlightAbortController, abortSecondaryHighlight] = useAbortController();
    const currentSecondaryHighlightQuery = useRef("");
    const secondaryHighlightProperty = useAppSelector(selectSecondaryHighlightProperty);

    const handleCanvasPick: MouseEventHandler<HTMLCanvasElement> = async (evt) => {
        if (!view?.lastRenderOutput || clippingBox.defining || !canvas || !scene) {
            return;
        }

        const pickCameraPlane =
            cameraState.type === CameraType.Orthographic &&
            (viewMode === ViewMode.CrossSection || viewMode === ViewMode.FollowPath);

        const result = await view.lastRenderOutput.pick(
            evt.nativeEvent.offsetX,
            evt.nativeEvent.offsetY,
            pickCameraPlane
        );

        if (deviation.mode !== "off" && cameraState.type === CameraType.Orthographic) {
            const isTouch = evt.nativeEvent instanceof PointerEvent && evt.nativeEvent.pointerType === "touch";
            const pickSize = isTouch ? 16 : 0;
            const deviation = await pickDeviationArea({
                view,
                size: pickSize,
                clickX: evt.nativeEvent.offsetX,
                clickY: evt.nativeEvent.offsetY,
            });

            if (deviation) {
                dispatch(
                    renderActions.setDeviationStamp({
                        mouseX: evt.nativeEvent.offsetX,
                        mouseY: evt.nativeEvent.offsetY,
                        data: {
                            deviation: deviation,
                        },
                    })
                );

                return;
            } else {
                dispatch(renderActions.setDeviationStamp(null));
            }
        } else {
            dispatch(renderActions.setDeviationStamp(null));
        }

        if (!result || result.objectId > 0x1000000) {
            if (picker === Picker.Measurement && measure.hover) {
                dispatch(measureActions.selectEntity(measure.hover as ExtendedMeasureEntity));
            }
            return;
        }

        const normal = result.normal.some((n) => Number.isNaN(n)) ? undefined : vec3.clone(result.normal);
        const position = vec3.clone(result.position);

        switch (picker) {
            case Picker.CrossSection:
                if (crossSectionPoint) {
                    dispatch(renderActions.setViewMode(ViewMode.CrossSection));
                    const mat = mat3.fromQuat(mat3.create(), view.camera.rotation);
                    let up = vec3.fromValues(0, 1, 0);
                    const topDown = vec3.equals(vec3.fromValues(mat[6], mat[7], mat[8]), up);
                    const pos = topDown
                        ? vec3.fromValues(result.position[0], crossSectionPoint[1], result.position[2])
                        : vec3.copy(vec3.create(), result.position);

                    const right = vec3.sub(vec3.create(), pos, crossSectionPoint);
                    const l = vec3.len(right);
                    vec3.scale(right, right, 1 / l);
                    const p = vec3.scaleAndAdd(vec3.create(), crossSectionPoint, right, l / 2);
                    let dir = vec3.cross(vec3.create(), up, right);

                    if (topDown) {
                        const midPt = (measureApi.toMarkerPoints(view, [p]) ?? [])[0];
                        if (midPt) {
                            const midPick = await view.lastRenderOutput.pick(midPt[0], midPt[1]);
                            if (midPick) {
                                vec3.copy(p, midPick.position);
                            }
                        }
                    } else if (right[1] < 0.01) {
                        right[1] = 0;
                        dir = vec3.clone(up);
                        vec3.cross(up, right, dir);
                        vec3.normalize(up, up);
                    } else {
                        vec3.normalize(dir, dir);
                    }
                    vec3.cross(right, up, dir);
                    vec3.normalize(right, right);

                    const rotation = quat.fromMat3(
                        quat.create(),
                        mat3.fromValues(right[0], right[1], right[2], up[0], up[1], up[2], dir[0], dir[1], dir[2])
                    );

                    const orthoMat = mat4.fromRotationTranslation(mat4.create(), rotation, p);

                    dispatch(
                        renderActions.setCamera({
                            type: CameraType.Orthographic,
                            params: {
                                kind: "ortho",
                                referenceCoordSys: orthoMat,
                                fieldOfView: 45,
                                near: -0.001,
                                far: 0.5,
                                position: [0, 0, 0],
                            },
                            gridOrigo: p as vec3,
                        })
                    );
                    dispatch(renderActions.setPicker(Picker.Object));
                    dispatch(orthoCamActions.setCrossSectionPoint(undefined));
                    dispatch(orthoCamActions.setCrossSectionHover(undefined));
                    dispatch(renderActions.setGrid({ enabled: true }));
                } else {
                    dispatch(orthoCamActions.setCrossSectionPoint(result.position as vec3));
                }
                break;
            case Picker.Object:
                if (result.objectId === -1) {
                    return;
                }

                const alreadySelected = highlightedObjects.ids[result.objectId];

                if (selectMultiple) {
                    if (alreadySelected) {
                        if (result.objectId === mainObject) {
                            dispatch(renderActions.setMainObject(undefined));
                        }
                        dispatchHighlighted(highlightActions.remove([result.objectId]));
                    } else {
                        dispatch(renderActions.setMainObject(result.objectId));
                        dispatchHighlighted(highlightActions.add([result.objectId]));
                    }
                } else {
                    if (alreadySelected) {
                        dispatch(renderActions.setMainObject(undefined));
                        dispatchHighlighted(highlightActions.setIds([]));

                        if (!secondaryHighlightProperty) {
                            return;
                        }

                        abortSecondaryHighlight();
                        dispatchHighlightCollections(
                            highlightCollectionsActions.setIds(HighlightCollection.SecondaryHighlight, [])
                        );
                        currentSecondaryHighlightQuery.current = "";
                    } else {
                        dispatch(renderActions.setMainObject(result.objectId));
                        dispatchHighlighted(highlightActions.setIds([result.objectId]));

                        if (!secondaryHighlightProperty) {
                            return;
                        }

                        const query = await scene
                            ?.getObjectReference(result.objectId)
                            .loadMetaData()
                            .then((metadata) => {
                                const query = metadata.properties.find(
                                    (prop) => prop[0] === secondaryHighlightProperty
                                );

                                return query ? query[1] : undefined;
                            });

                        if (
                            query &&
                            query === currentSecondaryHighlightQuery.current &&
                            highlightCollections.secondaryHighlight.idArr.length
                        ) {
                            return;
                        }

                        abortSecondaryHighlight();
                        dispatchHighlightCollections(
                            highlightCollectionsActions.setIds(HighlightCollection.SecondaryHighlight, [])
                        );

                        if (!query) {
                            return;
                        }

                        const abortSignal = secondaryHighlightAbortController.current.signal;
                        const loadingHandle = evt.timeStamp;
                        currentSecondaryHighlightQuery.current = query;
                        dispatch(renderActions.addLoadingHandle(loadingHandle));

                        try {
                            const iterator = scene.search(
                                {
                                    searchPattern: [
                                        { property: secondaryHighlightProperty, value: query, exact: true },
                                    ],
                                },
                                abortSignal
                            );

                            const res: number[] = [];
                            for await (const item of iterator) {
                                res.push(item.id);
                            }

                            dispatchHighlightCollections(
                                highlightCollectionsActions.setIds(HighlightCollection.SecondaryHighlight, res)
                            );
                        } catch (e) {
                            if (!abortSignal.aborted) {
                                console.warn(e);
                            }
                        } finally {
                            dispatch(renderActions.removeLoadingHandle(loadingHandle));
                        }
                    }
                }
                break;
            case Picker.ClippingPlane:
                if (!normal) {
                    return;
                }

                const w = -vec3.dot(normal, position);

                dispatch(renderActions.setPicker(Picker.Object));
                dispatch(
                    renderActions.setClippingPlanes({
                        planes: [vec4.fromValues(normal[0], normal[1], normal[2], w)],
                        baseW: w,
                    })
                );
                break;
            case Picker.OrthoPlane:
                const orthoController = api.createCameraController({ kind: "ortho" }, canvas);
                (orthoController as any).init(position, normal, view.camera);
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        params: orthoController.params as OrthoControllerParams,
                    })
                );
                dispatch(renderActions.setPicker(Picker.Object));

                break;
            case Picker.Measurement:
                if (measure.hover) {
                    dispatch(measureActions.selectEntity(measure.hover as ExtendedMeasureEntity));
                } else {
                    dispatch(measureActions.setLoadingBrep(true));
                    const entity = await measureScene?.pickMeasureEntity(
                        result.objectId,
                        position,
                        measurePickSettings
                    );
                    dispatch(measureActions.selectEntity(entity?.entity as ExtendedMeasureEntity));
                    dispatch(measureActions.setLoadingBrep(false));
                }
                break;
            case Picker.Manhole:
                if (result.objectId === -1) {
                    return;
                }
                dispatch(manholeActions.selectObj({ id: result.objectId, pos: position }));
                break;

            case Picker.FollowPathObject: {
                if (result.objectId === -1) {
                    return;
                }

                dispatch(followPathActions.setSelectedPositions([{ id: result.objectId, pos: position }]));
                break;
            }
            case Picker.Area: {
                dispatch(areaActions.addPoint([position, normal ?? [0, 0, 0]]));
                break;
            }
            case Picker.PointLine: {
                dispatch(pointLineActions.addPoint(position));
                break;
            }
            case Picker.HeightProfileEntity: {
                if (result.objectId === -1) {
                    return;
                }

                dispatch(heightProfileActions.selectPoint({ id: result.objectId, pos: vec3.clone(position) }));
                break;
            }
            default:
                console.warn("Picker not handled", picker);
        }
    };

    return handleCanvasPick;
}