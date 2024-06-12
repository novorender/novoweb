import { rotationFromDirection } from "@novorender/api";
import { mat3, quat, ReadonlyVec3, vec2, vec3, vec4 } from "gl-matrix";
import { MouseEventHandler, MutableRefObject, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
    useHighlightCollections,
} from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted, useHighlighted } from "contexts/highlighted";
import { useArcgisCanvasClickHandler } from "features/arcgis/hooks/useArcgisCanvasHandler";
import { areaActions } from "features/area";
import { followPathActions } from "features/followPath";
import { useCreateLocationForm } from "features/forms/hooks/useCreateLocationForm";
import { useLocationFormAssetClickHandler } from "features/forms/hooks/useLocationFormAssetClickHandler";
import { heightProfileActions } from "features/heightProfile";
import { manholeActions } from "features/manhole";
import { measureActions, selectMeasure, selectMeasurePickSettings } from "features/measure";
import { orthoCamActions, selectCrossSectionClipping, selectCrossSectionPoint } from "features/orthoCam";
import { clippingOutlineLaserActions } from "features/outlineLaser";
import { getOutlineLaser } from "features/outlineLaser";
import { pointLineActions } from "features/pointLine";
import { selectShowPropertiesStamp } from "features/properties/slice";
import { useAbortController } from "hooks/useAbortController";
import { ExtendedMeasureEntity, NodeType, ViewMode } from "types/misc";
import { isRealVec } from "utils/misc";
import { extractObjectIds } from "utils/objectData";
import { searchByPatterns, searchDeepByPatterns } from "utils/search";

import {
    renderActions,
    selectCamera,
    selectCameraType,
    selectClippingPlanes,
    selectDeviations,
    selectMainObject,
    selectPicker,
    selectSecondaryHighlightProperty,
    selectSelectMultiple,
    selectViewMode,
} from "../renderSlice";
import { CameraType, Picker, StampKind } from "../types";
import {
    applyCameraDistanceToMeasureTolerance,
    getLocalRotationAroundNormal,
    getObjectMetadataRotation,
} from "../utils";

export function useCanvasClickHandler({
    pointerDownStateRef,
}: {
    pointerDownStateRef: MutableRefObject<
        | {
              timestamp: number;
              x: number;
              y: number;
          }
        | undefined
    >;
}) {
    const dispatch = useAppDispatch();
    const highlightedObjects = useHighlighted();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const highlightCollections = useHighlightCollections();
    const {
        state: { view, canvas, db },
    } = useExplorerGlobals();

    const cameraType = useAppSelector(selectCameraType);
    const mainObject = useAppSelector(selectMainObject);
    const selectMultiple = useAppSelector(selectSelectMultiple);
    const cameraState = useAppSelector(selectCamera);
    const measure = useAppSelector(selectMeasure);
    const deviation = useAppSelector(selectDeviations);
    const picker = useAppSelector(selectPicker);
    const measurePickSettings = useAppSelector(selectMeasurePickSettings);
    const crossSectionPoint = useAppSelector(selectCrossSectionPoint);
    const crossSectionClipping = useAppSelector(selectCrossSectionClipping);
    const viewMode = useAppSelector(selectViewMode);
    const showPropertiesStamp = useAppSelector(selectShowPropertiesStamp);
    const { planes } = useAppSelector(selectClippingPlanes);

    const [secondaryHighlightAbortController, abortSecondaryHighlight] = useAbortController();
    const currentSecondaryHighlightQuery = useRef("");
    const secondaryHighlightProperty = useAppSelector(selectSecondaryHighlightProperty);

    const arcgisCanvasClickHandler = useArcgisCanvasClickHandler();
    const createLocationForm = useCreateLocationForm();
    const locationFormAssetClickHandler = useLocationFormAssetClickHandler();

    const handleCanvasPick: MouseEventHandler<HTMLCanvasElement> = async (evt) => {
        const pointerDownState = pointerDownStateRef.current;
        const longPress = pointerDownState && evt.timeStamp - pointerDownState.timestamp >= 800;
        const drag =
            pointerDownState &&
            vec2.dist([pointerDownState.x, pointerDownState.y], [evt.nativeEvent.offsetX, evt.nativeEvent.offsetY]) >=
                5;

        if (!view || !canvas || longPress || drag) {
            return;
        }
        if (picker === Picker.Object && arcgisCanvasClickHandler && arcgisCanvasClickHandler(evt)) {
            return;
        }

        const planePicking = cameraType === CameraType.Orthographic && view.renderState.camera.far < 1;

        pointerDownStateRef.current = undefined;
        const pickCameraPlane =
            cameraState.type === CameraType.Orthographic &&
            (viewMode === ViewMode.CrossSection ||
                viewMode === ViewMode.FollowPath ||
                viewMode === ViewMode.Deviations);

        const isTouch = evt.nativeEvent instanceof PointerEvent && evt.nativeEvent.pointerType === "touch";
        const pickOutline = measure.snapKind === "clippingOutline" && picker === Picker.Measurement;
        const result = await view.pick(evt.nativeEvent.offsetX, evt.nativeEvent.offsetY, {
            pickCameraPlane,
            sampleDiscRadius: isTouch ? 8 : 4,
            pickOutline,
        });

        if (!result || picker === Picker.CrossSection || picker === Picker.OutlineLaser) {
            switch (picker) {
                case Picker.Object:
                    dispatch(renderActions.setStamp(null));
                    return;
                case Picker.Measurement:
                    if (measure.hover) {
                        dispatch(
                            measureActions.selectEntity({
                                entity: (planePicking
                                    ? {
                                          ...measure.hover,
                                          settings: { planeMeasure: view.renderState.clipping.planes[0]?.normalOffset },
                                      }
                                    : measure.hover) as ExtendedMeasureEntity,
                                pin: evt.shiftKey,
                            })
                        );
                    }
                    return;
                case Picker.Area:
                    if (measure.hover?.drawKind === "vertex" && planes.length) {
                        const plane = planes[0].normalOffset;
                        dispatch(
                            areaActions.addPt(
                                [measure.hover.parameter, vec3.fromValues(-plane[0], -plane[1], -plane[2])],
                                view
                            )
                        );
                    }
                    return;
                case Picker.PointLine:
                    if (measure.hover?.drawKind === "vertex") {
                        dispatch(pointLineActions.addPoint(measure.hover.parameter, view));
                    }
                    return;
                case Picker.CrossSection: {
                    const position =
                        result?.position ??
                        view.worldPositionFromPixelPosition(evt.nativeEvent.offsetX, evt.nativeEvent.offsetY);

                    if (!position) {
                        return;
                    }

                    if (!crossSectionPoint) {
                        dispatch(orthoCamActions.setCrossSectionPoint(position));
                        return;
                    }

                    dispatch(renderActions.setViewMode(ViewMode.CrossSection));
                    const mat = mat3.fromQuat(mat3.create(), view.renderState.camera.rotation);
                    const up = vec3.fromValues(0, 0, 1);
                    const topDown = vec3.equals(vec3.fromValues(mat[6], mat[7], mat[8]), up);
                    const pos = topDown
                        ? vec3.fromValues(position[0], position[1], crossSectionPoint[2])
                        : vec3.copy(vec3.create(), position);

                    const right = vec3.sub(vec3.create(), crossSectionPoint, pos);
                    const l = vec3.len(right);
                    vec3.scale(right, right, 1 / l);
                    const p = vec3.scaleAndAdd(vec3.create(), crossSectionPoint, right, l / -2);
                    let dir = vec3.cross(vec3.create(), up, right);

                    if (topDown) {
                        const midPt = (view.measure?.draw.toMarkerPoints([p]) ?? [])[0];
                        if (midPt) {
                            const midPick = await view.pick(midPt[0], midPt[1], { sampleDiscRadius: 100 });
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

                    dispatch(
                        renderActions.setCamera({
                            type: CameraType.Orthographic,
                            goTo: {
                                position: p,
                                rotation,
                                fov: 45,
                                far: crossSectionClipping,
                            },
                            gridOrigo: p as vec3,
                        })
                    );
                    const w = vec3.dot(dir, p);
                    dispatch(
                        renderActions.setClippingPlanes({
                            enabled: true,
                            planes: [{ normalOffset: [dir[0], dir[1], dir[2], w], baseW: w, color: [0, 1, 0, 0.2] }],
                        })
                    );
                    dispatch(renderActions.setPicker(Picker.Object));
                    dispatch(orthoCamActions.setCrossSectionPoint(undefined));
                    dispatch(orthoCamActions.setCrossSectionHover(undefined));
                    return;
                }
                case Picker.OutlineLaser: {
                    if (!view.renderState.clipping.enabled || !view.renderState.clipping.planes.length) {
                        return;
                    }

                    let tracePosition: ReadonlyVec3 | undefined = undefined;

                    const plane = planes[0];
                    if (cameraType === CameraType.Orthographic) {
                        tracePosition = view.worldPositionFromPixelPosition(
                            evt.nativeEvent.offsetX,
                            evt.nativeEvent.offsetY
                        );
                    } else if (!result) {
                        return;
                    } else {
                        const { normalOffset } = plane;
                        const planeDir = vec3.fromValues(normalOffset[0], normalOffset[1], normalOffset[2]);
                        const camPos = view.renderState.camera.position;
                        const lineDir = vec3.sub(vec3.create(), result.position, camPos);
                        vec3.normalize(lineDir, lineDir);
                        const t = (normalOffset[3] - vec3.dot(planeDir, camPos)) / vec3.dot(planeDir, lineDir);
                        tracePosition = vec3.scaleAndAdd(vec3.create(), camPos, lineDir, t);
                    }

                    if (!tracePosition) {
                        return;
                    }

                    dispatch(
                        clippingOutlineLaserActions.setLaserPlane({
                            normalOffset: plane.normalOffset,
                            rotation: plane.rotation ?? 0,
                        })
                    );
                    const laser = await getOutlineLaser(tracePosition, view, planes[0].rotation ?? 0);
                    if (laser) {
                        dispatch(clippingOutlineLaserActions.addLaser(laser));
                    }

                    return;
                }
                default:
                    return;
            }
        }

        const normal =
            isRealVec([...result.normal]) && vec3.dot(result.normal, result.normal) !== 0
                ? vec3.clone(result.normal)
                : undefined;
        const position = vec3.clone(result.position);

        switch (picker) {
            case Picker.FormLocation:
                if (result) {
                    createLocationForm({ location: position });
                    dispatch(renderActions.stopPicker(Picker.FormLocation));
                }
                return;
            case Picker.Object: {
                if (
                    deviation.mixFactor !== 0 &&
                    cameraState.type === CameraType.Orthographic &&
                    result.deviation !== undefined
                ) {
                    dispatch(
                        renderActions.setStamp({
                            kind: StampKind.Deviation,
                            mouseX: evt.nativeEvent.offsetX,
                            mouseY: evt.nativeEvent.offsetY,
                            pinned: false,
                            data: {
                                deviation: result.deviation,
                            },
                        })
                    );
                    return;
                }

                if (locationFormAssetClickHandler(result)) {
                    return;
                }

                if (result.objectId === -1) {
                    dispatch(renderActions.setStamp(null));
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
                    if (alreadySelected && result.objectId === mainObject) {
                        dispatch(renderActions.setMainObject(undefined));
                        dispatch(renderActions.setStamp(null));
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
                        if (!alreadySelected) {
                            dispatchHighlighted(highlightActions.setIds([result.objectId]));
                        }

                        if ((!showPropertiesStamp && !secondaryHighlightProperty) || !db) {
                            return;
                        }

                        const metadata = await (view.data
                            ? view.data.getObjectMetaData(result.objectId)
                            : db.getObjectMetdata(result.objectId));

                        if (showPropertiesStamp) {
                            dispatch(
                                renderActions.setStamp({
                                    kind: StampKind.Properties,
                                    properties: [
                                        ["Name", metadata.name],
                                        ["Path", metadata.path],
                                        ...metadata.properties,
                                    ],
                                    mouseX: evt.nativeEvent.offsetX,
                                    mouseY: evt.nativeEvent.offsetY,
                                    pinned: true,
                                })
                            );
                        }

                        if (!secondaryHighlightProperty) {
                            return;
                        }

                        const property = metadata.properties.find((prop) => prop[0] === secondaryHighlightProperty);
                        const query = property && property[1];

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
                            const res: number[] = [];

                            const baseSearchProps = {
                                db,
                                abortSignal,
                                searchPatterns: [{ property: secondaryHighlightProperty, value: query, exact: true }],
                            };

                            if (metadata.type === NodeType.Internal) {
                                await searchDeepByPatterns({
                                    ...baseSearchProps,
                                    callback: (ids) => res.push(...ids),
                                });
                            } else {
                                await searchByPatterns({
                                    ...baseSearchProps,
                                    callback: (refs) => res.push(...extractObjectIds(refs)),
                                });
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
            }
            case Picker.ClippingPlane: {
                if (!normal || result.sampleType !== "surface" || !db) {
                    return;
                }

                let rotation = 0;
                try {
                    if (result.objectId) {
                        const rotationQuat = await getObjectMetadataRotation(view, db, result.objectId);
                        if (rotationQuat) {
                            const angleOffset =
                                Math.abs(vec3.dot(normal, vec3.fromValues(1, 0, 0))) > 0.7 ? Math.PI / 2 : 0;
                            rotation = getLocalRotationAroundNormal(rotationQuat, normal) + angleOffset;
                        }
                    }
                } catch (ex) {
                    console.warn("Error getting object rotation", ex);
                }

                const w = vec3.dot(normal, position);

                dispatch(renderActions.setPicker(Picker.Object));
                dispatch(
                    renderActions.addClippingPlane({
                        normalOffset: vec4.fromValues(normal[0], normal[1], normal[2], w) as Vec4,
                        baseW: w,
                        rotation,
                    })
                );
                break;
            }
            case Picker.OrthoPlane:
                if (!normal || result.sampleType !== "surface") {
                    return;
                }

                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        goTo: {
                            position,
                            rotation: rotationFromDirection(normal),
                            fov: 50,
                        },
                    })
                );
                dispatch(renderActions.setPicker(Picker.Object));

                break;
            case Picker.Measurement:
                if (measure.hover) {
                    dispatch(
                        measureActions.selectEntity({
                            entity: (planePicking
                                ? {
                                      ...measure.hover,
                                      settings: { planeMeasure: view.renderState.clipping.planes[0]?.normalOffset },
                                  }
                                : measure.hover) as ExtendedMeasureEntity,
                            pin: evt.shiftKey,
                        })
                    );
                } else if (measure.snapKind === "clippingOutline") {
                    const pointEntity: ExtendedMeasureEntity = {
                        drawKind: "vertex",
                        ObjectId: result.objectId,
                        parameter: result.position,
                    };
                    dispatch(
                        measureActions.selectEntity({
                            entity: pointEntity,
                            pin: evt.shiftKey,
                        })
                    );
                } else {
                    dispatch(measureActions.setLoadingBrep(true));
                    const tolerance = applyCameraDistanceToMeasureTolerance(
                        result.position,
                        view.renderState.camera.position,
                        measurePickSettings
                    );
                    const entity = await view.measure?.core.pickMeasureEntity(result.objectId, position, tolerance);
                    if (entity?.entity) {
                        dispatch(
                            measureActions.selectEntity({
                                entity: entity.entity,
                                pin: evt.shiftKey,
                            })
                        );
                    }
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
                if (measure.hover && measure.hover.drawKind === "vertex" && planes.length > 0) {
                    const plane = planes[0].normalOffset;
                    const planeDir = vec3.fromValues(-plane[0], -plane[1], -plane[2]);
                    dispatch(areaActions.addPt([measure.hover.parameter, planeDir], view));
                } else {
                    let useNormal = normal;
                    if (normal === undefined && cameraType === CameraType.Orthographic) {
                        useNormal = vec3.fromValues(0, 0, 1);
                        vec3.transformQuat(useNormal, useNormal, view.renderState.camera.rotation);
                    }
                    dispatch(areaActions.addPt([position, useNormal ?? [0, 0, 0]], view));
                }
                break;
            }
            case Picker.PointLine: {
                if (measure.hover && measure.hover.drawKind === "vertex") {
                    dispatch(pointLineActions.addPoint(measure.hover.parameter, view));
                } else {
                    dispatch(pointLineActions.addPoint(position, view));
                }

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
