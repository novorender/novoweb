import { Bookmark } from "@novorender/data-js-api";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useLazyHidden } from "contexts/hidden";
import { HighlightCollection, useLazyHighlightCollections } from "contexts/highlightCollections";
import { useLazyHighlighted } from "contexts/highlighted";
import { GroupStatus, isInternalGroup, useLazyObjectGroups } from "contexts/objectGroups";
import { useLazySelectionBasket } from "contexts/selectionBasket";
import { selectAreaPoints } from "features/area";
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

    const {
        state: { view },
    } = useExplorerGlobals(true);
    const groups = useLazyObjectGroups();
    const highlighted = useLazyHighlighted();
    const highlightCollections = useLazyHighlightCollections();
    const hidden = useLazyHidden();
    const selectionBasket = useLazySelectionBasket();

    const create = (img?: string): Omit<Bookmark, "name" | "description" | "img"> & { img?: string } => {
        return {
            img,
            selectedOnly: false, // legacy
            v1: {
                viewMode,
                grid,
                clipping: {
                    ...clipping,
                    planes: clipping.planes.map((plane) => ({ normalOffset: plane.normalOffset, color: plane.color })),
                },
                camera: view.renderState.camera,
                options: {
                    addToSelectionBasket: false, // flip on create() returned if needed
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
                followPath: undefined,
            },
        };
    };

    return create;
}
