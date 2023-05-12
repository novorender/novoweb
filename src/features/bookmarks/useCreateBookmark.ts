import { Bookmark } from "@novorender/data-js-api";
import { OrthoControllerParams } from "@novorender/webgl-api";
import { mat4, quat, vec3 } from "gl-matrix";

import { useAppSelector } from "app/store";
import { isInternalGroup, useLazyObjectGroups } from "contexts/objectGroups";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useLazyHidden } from "contexts/hidden";
import { useLazyHighlighted } from "contexts/highlighted";
import { useLazySelectionBasket } from "contexts/selectionBasket";
import {
    ObjectVisibility,
    selectDefaultVisibility,
    selectMainObject,
    selectSelectionBasketMode,
    selectSubtrees,
    selectViewMode,
    SubtreeStatus,
} from "features/render/renderSlice";
import { selectMeasure } from "features/measure";
import { selectFollowPath } from "features/followPath";
import { selectAreaPoints } from "features/area";
import { selectPointLinePoints } from "features/pointLine";
import {
    selectManholeCollisionSettings,
    selectManholeCollisionTarget,
    selectManholeMeasureValues,
} from "features/manhole";
import { HighlightCollection, useLazyHighlightCollections } from "contexts/highlightCollections";
import { ViewMode } from "types/misc";
import { selectDeviations } from "features/deviations";

export function useCreateBookmark() {
    const measurement = useAppSelector(selectMeasure);
    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const mainObject = useAppSelector(selectMainObject);
    const selectionBasketMode = useAppSelector(selectSelectionBasketMode);
    const followPath = useAppSelector(selectFollowPath);
    const areaPts = useAppSelector(selectAreaPoints);
    const pointLinePts = useAppSelector(selectPointLinePoints);
    const subtrees = useAppSelector(selectSubtrees);
    const manhole = useAppSelector(selectManholeMeasureValues);
    const manholeCollisionTarget = useAppSelector(selectManholeCollisionTarget);
    const viewMode = useAppSelector(selectViewMode);
    const manholeCollisionSettings = useAppSelector(selectManholeCollisionSettings);
    const deviations = useAppSelector(selectDeviations);

    const {
        state: { view },
    } = useExplorerGlobals(true);
    const objectGroups = useLazyObjectGroups();
    const highlighted = useLazyHighlighted();
    const highlightCollections = useLazyHighlightCollections();
    const hidden = useLazyHidden();
    const selectionBasket = useLazySelectionBasket();

    const create = (img?: string): Omit<Bookmark, "name" | "description" | "img"> & { img?: string } => {
        const camera = view.camera;
        const { highlight: _highlight, ...clippingPlanes } = view.settings.clippingPlanes;
        const { ...clippingVolume } = view.settings.clippingVolume;
        const selectedOnly = defaultVisibility !== ObjectVisibility.Neutral;

        const selBasket: Bookmark["selectionBasket"] = selectionBasket.current.idArr.length
            ? {
                  ids: selectionBasket.current.idArr,
                  mode: selectionBasketMode,
              }
            : undefined;

        const groups = objectGroups.current
            .map((grp) => ({
                id: grp.id,
                selected: grp.selected,
                hidden: grp.hidden,
                ids: isInternalGroup(grp) ? grp.ids : undefined,
            }))
            .concat({
                id: "",
                selected: true,
                hidden: false,
                ids: highlighted.current.idArr.concat(
                    mainObject !== undefined && !highlighted.current.ids[mainObject] ? [mainObject] : []
                ),
            })
            .concat({
                id: "",
                selected: false,
                hidden: true,
                ids: hidden.current.idArr,
            });

        let fp: Bookmark["followPath"] | undefined = undefined;
        if (followPath.selectedIds.length || followPath.selectedPositions.length) {
            const fpBase = {
                profile: Number(followPath.profile),
                currentCenter: followPath.currentCenter,
            };

            fp = followPath.selectedIds.length
                ? {
                      ...fpBase,
                      ids: followPath.selectedIds,
                      ...(followPath.drawRoadIds ? { roadIds: followPath.drawRoadIds } : {}),
                  }
                : {
                      ...fpBase,
                      parametric: followPath.selectedPositions,
                  };
        }

        const base = {
            img,
            objectGroups: groups,
            selectedOnly,
            clippingVolume,
            selectionBasket: selBasket,
            defaultVisibility,
            followPath: fp,
            highlightCollections: {
                [HighlightCollection.SecondaryHighlight]: {
                    ids: highlightCollections.current[HighlightCollection.SecondaryHighlight].idArr,
                },
            },
            clippingPlanes: {
                ...clippingPlanes,
                bounds: {
                    min: Array.from(clippingPlanes.bounds.min) as Vec3,
                    max: Array.from(clippingPlanes.bounds.max) as Vec3,
                },
            },
            viewMode: viewMode === ViewMode.Panorama ? ViewMode.Default : viewMode,
            grid: { ...view.settings.grid },
            deviations: {
                mode: deviations.mode,
                index: deviations.index,
            },
            ...(measurement.selectedEntities.length > 0
                ? { selectedMeasureEntities: measurement.selectedEntities }
                : {}),
            ...(areaPts.length ? { area: { pts: areaPts } } : {}),
            ...(pointLinePts.length ? { pointLine: { pts: pointLinePts } } : {}),
            ...(manhole
                ? {
                      manhole: {
                          id: manhole.ObjectId,
                          ...(manholeCollisionTarget
                              ? {
                                    collisionTarget: {
                                        selected: manholeCollisionTarget.selected,
                                    },
                                    collisionSettings: manholeCollisionSettings,
                                }
                              : {}),
                      },
                  }
                : {}),
            ...(subtrees
                ? {
                      subtrees: {
                          triangles: subtrees.triangles === SubtreeStatus.Shown,
                          points: subtrees.points === SubtreeStatus.Shown,
                          terrain: subtrees.terrain === SubtreeStatus.Shown,
                          lines: subtrees.lines === SubtreeStatus.Shown,
                          documents: subtrees.documents === SubtreeStatus.Shown,
                      },
                  }
                : {}),
        };

        if (camera.kind === "pinhole") {
            const { kind, position, rotation, fieldOfView, near, far } = camera;

            return {
                ...base,
                camera: {
                    kind,
                    position: vec3.copy(vec3.create(), position),
                    rotation: quat.copy(quat.create(), rotation),
                    fieldOfView,
                    near,
                    far,
                },
            };
        } else {
            const params = camera.controller.params as OrthoControllerParams;
            const safeParams: OrthoControllerParams = {
                ...params,
                referenceCoordSys: params.referenceCoordSys
                    ? (Array.from(params.referenceCoordSys) as mat4)
                    : undefined,
                position: params.position ? (Array.from(params.position) as vec3) : undefined,
            };

            if (!safeParams.referenceCoordSys) {
                delete safeParams.referenceCoordSys;
            }
            if (!safeParams.position) {
                delete safeParams.position;
            }

            return {
                ...base,
                ortho: safeParams,
            };
        }
    };

    return create;
}
