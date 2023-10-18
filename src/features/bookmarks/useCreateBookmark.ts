import { Bookmark, ExplorerBookmarkState } from "@novorender/data-js-api";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useLazyHidden } from "contexts/hidden";
import { HighlightCollection, useLazyHighlightCollections } from "contexts/highlightCollections";
import { useLazyHighlighted } from "contexts/highlighted";
import { GroupStatus, isInternalGroup, useLazyObjectGroups } from "contexts/objectGroups";
import { useLazySelectionBasket } from "contexts/selectionBasket";
import { selectAreaPoints } from "features/area";
import {
    GetMeasurePointsFromTracer,
    TraceMeasurement,
    selectOutlineLaserPlane,
    selectOutlineLasers,
} from "features/clippingOutline";
import { selectFollowPath } from "features/followPath";
import {
    selectManholeCollisionSettings,
    selectManholeCollisionTarget,
    selectManholeMeasureValues,
} from "features/manhole";
import { selectMeasure } from "features/measure";
import { selectPointLinePoints } from "features/pointLine";
import {
    SubtreeStatus,
    selectBackground,
    selectClippingPlanes,
    selectDefaultVisibility,
    selectGrid,
    selectMainObject,
    selectPoints,
    selectSelectionBasketMode,
    selectSubtrees,
    selectTerrain,
    selectViewMode,
} from "features/render";
import { ReadonlyVec3 } from "gl-matrix";
import { ViewMode } from "types/misc";

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
    const backgroundColor = useAppSelector(selectBackground).color;
    const clipping = useAppSelector(selectClippingPlanes);
    const terrain = useAppSelector(selectTerrain);
    const grid = useAppSelector(selectGrid);
    const deviations = useAppSelector(selectPoints).deviation;
    const outlineLasers = useAppSelector(selectOutlineLasers);
    const laserPlane = useAppSelector(selectOutlineLaserPlane);

    const {
        state: { view },
    } = useExplorerGlobals(true);
    const groups = useLazyObjectGroups();
    const highlighted = useLazyHighlighted();
    const highlightCollections = useLazyHighlightCollections();
    const hidden = useLazyHidden();
    const selectionBasket = useLazySelectionBasket();

    const copyTraceMeasurement = (
        measurement: TraceMeasurement | undefined,
        laserPosition: ReadonlyVec3,
        startAr: ReadonlyVec3[],
        endAr: ReadonlyVec3[]
    ) => {
        if (measurement) {
            const pts = GetMeasurePointsFromTracer(measurement, startAr, endAr);
            if (pts) {
                return { laserPosition: laserPosition, start: pts[0], end: pts[1] };
            }
            return undefined;
        }
        return undefined;
    };

    const create = (
        img?: string
    ): Omit<Bookmark, "name" | "description" | "img"> & { img?: string; explorerState: ExplorerBookmarkState } => {
        return {
            img,
            selectedOnly: false, // legacy
            explorerState: {
                viewMode,
                grid,
                clipping: {
                    ...clipping,
                    planes: clipping.planes.map((plane) => ({ normalOffset: plane.normalOffset, color: plane.color })),
                },
                camera: view.renderState.camera,
                options: {
                    addToSelectionBasket: false, // change on create() return value if needed
                },
                subtrees: {
                    triangles: subtrees.triangles === SubtreeStatus.Shown,
                    points: subtrees.points === SubtreeStatus.Shown,
                    terrain: subtrees.terrain === SubtreeStatus.Shown,
                    lines: subtrees.lines === SubtreeStatus.Shown,
                    documents: subtrees.documents === SubtreeStatus.Shown,
                },
                background: {
                    color: backgroundColor,
                },
                terrain: {
                    asBackground: terrain.asBackground,
                },
                deviations: {
                    index: deviations.index,
                    mixFactor: deviations.mixFactor,
                },
                groups: groups.current
                    .filter((group) => !isInternalGroup(group))
                    .filter((group) => group.status !== GroupStatus.None)
                    .map(({ id, status }) => ({ id, status })),
                objects: {
                    defaultVisibility,
                    mainObject: {
                        id: mainObject,
                    },
                    hidden: { ids: hidden.current.idArr },
                    highlighted: { ids: highlighted.current.idArr },
                    highlightCollections: {
                        secondaryHighlight: {
                            ids: highlightCollections.current[HighlightCollection.SecondaryHighlight].idArr,
                        },
                    },
                    selectionBasket: { ids: selectionBasket.current.idArr, mode: selectionBasketMode },
                },
                measurements: {
                    area: {
                        points: areaPts,
                    },
                    pointLine: {
                        points: pointLinePts,
                    },
                    measure: {
                        entities: measurement.selectedEntities,
                    },
                    manhole: {
                        id: manhole?.ObjectId,
                        collisionTarget: manholeCollisionTarget,
                        collisionSettings: manholeCollisionSettings,
                    },
                },
                followPath:
                    viewMode === ViewMode.FollowPath &&
                    followPath.currentCenter &&
                    (followPath.selectedIds.length || followPath.selectedPositions.length)
                        ? {
                              selected: {
                                  positions: followPath.selectedPositions.length
                                      ? followPath.selectedPositions
                                      : undefined,
                                  ids: followPath.selectedIds,
                                  landXmlPathId: followPath.selectedPath,
                              },
                              drawLayers: {
                                  roadIds: followPath.drawRoadIds ?? [],
                              },
                              profileNumber: Number(followPath.profile),
                              currentCenter: followPath.currentCenter,
                              deviations: {
                                  prioritization: followPath.deviations.prioritization,
                                  line: followPath.deviations.line,
                                  lineColor: followPath.deviations.lineColor,
                              },
                          }
                        : undefined,

                outlineMeasure:
                    outlineLasers.length > 0 && laserPlane
                        ? {
                              laserPlane,
                              lasers: outlineLasers
                                  .map((t) => {
                                      let measurementX = copyTraceMeasurement(
                                          t.measurementX,
                                          t.laserPosition,
                                          t.left,
                                          t.right
                                      );
                                      let measurementY = copyTraceMeasurement(
                                          t.measurementY,
                                          t.laserPosition,
                                          t.down,
                                          t.up
                                      );
                                      if (measurementX === undefined && measurementY === undefined) {
                                          return undefined;
                                      }
                                      return { laserPosition: t.laserPosition, measurementX, measurementY };
                                  })
                                  .filter((f) => f !== undefined) as {
                                  laserPosition: ReadonlyVec3;
                                  measurementX?: { start: ReadonlyVec3; end: ReadonlyVec3 };
                                  measurementY?: { start: ReadonlyVec3; end: ReadonlyVec3 };
                              }[],
                          }
                        : undefined,
            },
        };
    };

    return create;
}
