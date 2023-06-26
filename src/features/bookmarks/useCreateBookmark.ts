import { Bookmark } from "@novorender/data-js-api";
import { OrthoControllerParams } from "@novorender/webgl-api";
import { mat4, quat, vec3 } from "gl-matrix";

import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useLazyHidden } from "contexts/hidden";
import { HighlightCollection, useLazyHighlightCollections } from "contexts/highlightCollections";
import { useLazyHighlighted } from "contexts/highlighted";
import { isInternalGroup, useLazyObjectGroups } from "contexts/objectGroups";
import { useLazySelectionBasket } from "contexts/selectionBasket";
import { selectAreaPoints } from "features/area";
import { selectDeviations } from "features/deviations";
import { selectFollowPath } from "features/followPath";
import {
    selectManholeCollisionSettings,
    selectManholeCollisionTarget,
    selectManholeMeasureValues,
} from "features/manhole";
import { selectMeasure } from "features/measure";
import { selectPointLinePoints } from "features/pointLine";
import {
    ObjectVisibility,
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
    const objectGroups = useLazyObjectGroups();
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
                    planes: clipping.planes.map((plane) => plane.plane),
                },
                camera: view.renderState.camera,
                options: {
                    addToSelectionBasket: false,
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
                groups: [],
                objects: {
                    defaultVisibility,
                    mainObject: {
                        id: mainObject,
                    },
                    hidden: { ids: [] },
                    highlighted: { ids: [] },
                    highlightCollections: {
                        secondaryHighlight: {
                            ids: [],
                        },
                    },
                    selectionBasket: { ids: [] },
                },
                measurements: {
                    area: {
                        points: [],
                    },
                    pointLine: {
                        points: [],
                    },
                    measure: {
                        entities: [],
                    },
                    manhole: {
                        id: undefined,
                        collisionTarget: undefined,
                        collisionSettings: undefined,
                    },
                },
                followPath: undefined,
            },
        };
    };

    return create;
}
