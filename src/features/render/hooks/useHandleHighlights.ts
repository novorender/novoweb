import {
    createColorSetHighlight,
    createNeutralHighlight,
    createTransparentHighlight,
    RenderStateHighlightGroup,
} from "@novorender/api";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useHidden } from "contexts/hidden";
import { useHighlightCollections } from "contexts/highlightCollections";
import { useHighlighted } from "contexts/highlighted";
import { GroupStatus, ObjectGroup, useObjectGroups } from "contexts/objectGroups";
import { ImmutableObjectIdSet } from "contexts/objectGroups/reducer";
import { useSelectionBasket } from "contexts/selectionBasket";
import { selectAllDeviationGroups, selectSelectedProfile } from "features/deviations";
import { selectVisibleOutlineGroups } from "features/outlineLaser";
import { selectPropertyTreeGroups } from "features/propertyTree/slice";
import { useFillGroupIds } from "hooks/useFillGroupIds";
import { ViewMode } from "types/misc";

import {
    renderActions,
    selectCameraType,
    selectDefaultVisibility,
    selectMainObject,
    selectSelectionBasketColor,
    selectSelectionBasketMode,
    selectViewMode,
} from "../renderSlice";
import { CameraType, ObjectVisibility, SelectionBasketMode } from "../types";

export function useHandleHighlights() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const mainObject = useAppSelector(selectMainObject);
    const highlighted = useHighlighted();
    const { secondaryHighlight, formsNew, formsOngoing, formsCompleted, clashObjects1, clashObjects2 } =
        useHighlightCollections();
    const hidden = useHidden().idArr;
    const groups = useObjectGroups();
    const defaultVisibility = useAppSelector(selectDefaultVisibility);
    const basket = useSelectionBasket();
    const dispatch = useAppDispatch();
    const basketColor = useAppSelector(selectSelectionBasketColor);
    const basketMode = useAppSelector(selectSelectionBasketMode);
    const outlineGroups = useAppSelector(selectVisibleOutlineGroups);
    const { groups: propertyTreeGroups } = useAppSelector(selectPropertyTreeGroups);
    const cameraType = useAppSelector(selectCameraType);
    const viewMode = useAppSelector(selectViewMode);
    const fillGroupIds = useFillGroupIds();
    const deviationProfile = useAppSelector(selectSelectedProfile);
    const deviationLegendGroups = useAppSelector(selectAllDeviationGroups);

    const id = useRef(0);
    const prevFrozen = useRef<{ idSets: ObjectGroup["ids"][]; ids: Uint32Array }>();
    const prevHidden = useRef<{ ids: number[]; idSets: ObjectGroup["ids"][]; allIds: Uint32Array }>();

    useEffect(() => {
        apply();

        async function apply() {
            if (!view) {
                return;
            }

            view.modifyRenderState({
                highlights: {
                    defaultAction:
                        defaultVisibility === ObjectVisibility.Neutral
                            ? createNeutralHighlight()
                            : defaultVisibility === ObjectVisibility.SemiTransparent
                              ? createTransparentHighlight(0.2)
                              : "hide",
                },
            });

            const currentId = ++id.current;
            const loading = performance.now();
            dispatch(renderActions.addLoadingHandle(loading));
            await fillGroupIds(groups.filter((group) => group.status !== GroupStatus.None));
            dispatch(renderActions.removeLoadingHandle(loading));

            if (currentId !== id.current) {
                return;
            }

            const { coloredGroups, hiddenGroups, frozenGroups, semiTransparent, coloredDeviationGroups } =
                groups.reduce(
                    (prev, group, idx) => {
                        if (viewMode === ViewMode.Deviations) {
                            for (const g of deviationLegendGroups) {
                                if (g.isDeviationColored && g.id === group.id && g.status !== GroupStatus.Hidden) {
                                    prev.coloredDeviationGroups.push(group);
                                    return prev;
                                }
                            }
                        }

                        switch (group.status) {
                            case GroupStatus.Selected: {
                                const color = group.color.toString();

                                if (prev.coloredGroups[color]) {
                                    group.ids.forEach((id) => {
                                        prev.coloredGroups[color].ids.add(id);
                                        prev.coloredGroups[color].idx = idx;
                                    });
                                } else {
                                    prev.coloredGroups[color] = {
                                        idx,
                                        action: createColorSetHighlight(group.color),
                                        ids: new Set(group.ids),
                                    };
                                }
                                break;
                            }
                            case GroupStatus.Hidden: {
                                if (!group.opacity) {
                                    prev.hiddenGroups.push(group);
                                } else {
                                    prev.semiTransparent.push(group);
                                }
                                break;
                            }
                            case GroupStatus.Frozen: {
                                prev.frozenGroups.push(group);
                                break;
                            }
                            default:
                                break;
                        }

                        return prev;
                    },
                    {
                        coloredGroups: {} as {
                            [color: string]: {
                                ids: Set<number>;
                                action: RenderStateHighlightGroup["action"];
                                idx: number;
                            };
                        },
                        frozenGroups: [] as ObjectGroup[],
                        hiddenGroups: [] as { ids: ImmutableObjectIdSet }[],
                        semiTransparent: [] as ObjectGroup[],
                        coloredDeviationGroups: [] as ObjectGroup[],
                    },
                );

            const { coloredPropertyTreeGroups } = propertyTreeGroups.reduce(
                (prev, group) => {
                    switch (group.status) {
                        case GroupStatus.Selected: {
                            const color = group.color.toString();

                            if (prev.coloredPropertyTreeGroups[color]) {
                                Object.values(group.ids).forEach((id) => {
                                    prev.coloredPropertyTreeGroups[color].ids.add(id);
                                });
                            } else {
                                prev.coloredPropertyTreeGroups[color] = {
                                    action: createColorSetHighlight(group.color),
                                    ids: new Set(Object.values(group.ids)),
                                };
                            }
                            break;
                        }
                        case GroupStatus.Hidden: {
                            prev.hiddenGroups.push({ ids: new Set(Object.values(group.ids)) });
                            break;
                        }
                        default:
                            break;
                    }

                    return prev;
                },
                {
                    coloredPropertyTreeGroups: {} as {
                        [color: string]: { ids: Set<number>; action: RenderStateHighlightGroup["action"] };
                    },
                    hiddenGroups: hiddenGroups as { ids: Set<number> }[],
                },
            );

            let allHiddenIds: Uint32Array;
            if (
                prevHidden.current &&
                prevHidden.current.ids === hidden &&
                areArraysEqual(prevHidden.current.idSets, hiddenGroups, (idSet, g) => idSet === g.ids)
            ) {
                allHiddenIds = prevHidden.current.allIds;
            } else {
                const idSets = hiddenGroups.map((g) => g.ids);
                allHiddenIds = objectIdSet([hidden, ...idSets]).toArray();
                prevHidden.current = {
                    ids: hidden,
                    idSets,
                    allIds: allHiddenIds,
                };
            }

            let allFrozenIds: Uint32Array;
            if (
                prevFrozen.current &&
                areArraysEqual(prevFrozen.current.idSets, frozenGroups, (idSet, g) => idSet === g.ids)
            ) {
                allFrozenIds = prevFrozen.current.ids;
            } else {
                allFrozenIds = objectIdSet(frozenGroups.map((g) => g.ids)).toArray();
                prevFrozen.current = {
                    idSets: frozenGroups.map((g) => g.ids),
                    ids: allFrozenIds,
                };
            }

            const deviationIds = objectIdSet(coloredDeviationGroups.map((g) => g.ids)).toArray();

            view.modifyRenderState({
                highlights: {
                    groups: [
                        ...(defaultVisibility === ObjectVisibility.Neutral
                            ? semiTransparent.map((group) => ({
                                  objectIds: new Uint32Array(group.ids).sort(),
                                  action: createTransparentHighlight(group.opacity),
                              }))
                            : []),
                        ...(cameraType === CameraType.Orthographic &&
                        viewMode !== ViewMode.FollowPath &&
                        viewMode !== ViewMode.Deviations
                            ? outlineGroups.map((group) => ({
                                  objectIds: new Uint32Array(group.ids).sort(),
                                  outlineColor: group.color,
                              }))
                            : []),
                        {
                            objectIds: allFrozenIds,
                            action: "filter",
                        },
                        {
                            objectIds: allHiddenIds,
                            action: "hide",
                        },
                        {
                            objectIds: new Uint32Array(basket.idArr).sort(),
                            action: basketColor.use
                                ? createColorSetHighlight(basketColor.color)
                                : createNeutralHighlight(),
                        },
                        ...Object.values(coloredGroups)
                            .sort((a, b) => a.idx - b.idx)
                            .map((group) => ({
                                objectIds: new Uint32Array(
                                    basketMode === SelectionBasketMode.Loose
                                        ? group.ids
                                        : basket.idArr.filter((id) => group.ids.has(id)),
                                ).sort(),
                                action: group.action,
                            })),
                        ...Object.values(coloredPropertyTreeGroups).map((group) => ({
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? group.ids
                                    : basket.idArr.filter((id) => group.ids.has(id)),
                            ).sort(),
                            action: group.action,
                        })),
                        ...(deviationProfile && deviationIds.length
                            ? [
                                  {
                                      objectIds: deviationIds,
                                      action: createTransparentHighlight(1),
                                      pointVisualization: {
                                          kind: "deviation" as const,
                                          index: deviationProfile.index,
                                      },
                                  },
                              ]
                            : []),
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? secondaryHighlight.idArr
                                    : basket.idArr.filter((id) => secondaryHighlight.ids[id]),
                            ).sort(),
                            action: createColorSetHighlight(secondaryHighlight.color),
                        },
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? formsNew.idArr
                                    : basket.idArr.filter((id) => formsNew.ids[id]),
                            ).sort(),
                            action: createColorSetHighlight(formsNew.color),
                        },
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? formsOngoing.idArr
                                    : basket.idArr.filter((id) => formsOngoing.ids[id]),
                            ).sort(),
                            action: createColorSetHighlight(formsOngoing.color),
                        },
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? formsCompleted.idArr
                                    : basket.idArr.filter((id) => formsCompleted.ids[id]),
                            ).sort(),
                            action: createColorSetHighlight(formsCompleted.color),
                        },
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? clashObjects1.idArr
                                    : basket.idArr.filter((id) => clashObjects1.ids[id]),
                            ).sort(),
                            action: createColorSetHighlight(clashObjects1.color),
                        },
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? clashObjects2.idArr
                                    : basket.idArr.filter((id) => clashObjects2.ids[id]),
                            ).sort(),
                            action: createColorSetHighlight(clashObjects2.color),
                        },
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? mainObject !== undefined
                                        ? highlighted.idArr.concat(mainObject)
                                        : highlighted.idArr
                                    : basket.idArr.filter((id) => id === mainObject || highlighted.ids[id]),
                            ).sort(),
                            action: createColorSetHighlight(highlighted.color),
                            outlineColor: [highlighted.color[0], highlighted.color[1], highlighted.color[3]],
                        },
                    ],
                },
            });
        }
    }, [
        view,
        dispatch,
        highlighted,
        secondaryHighlight,
        formsNew,
        formsOngoing,
        formsCompleted,
        clashObjects1,
        clashObjects2,
        hidden,
        groups,
        propertyTreeGroups,
        defaultVisibility,
        basket,
        mainObject,
        basketColor,
        basketMode,
        outlineGroups,
        cameraType,
        viewMode,
        fillGroupIds,
        deviationProfile,
        deviationLegendGroups,
    ]);
}

/**
 * The idea is to use array (index is object ID) instead of set if ID range is
 * so array is not too big and pretty close or smaller than total ID count of the underlying sets.
 * @param idSets Array of object ID sets or arrays
 * @returns Sorted combined ID array
 */
function objectIdSet(idSets: (ImmutableObjectIdSet | Set<number> | number[])[]) {
    // Find object ID range
    let minId = Number.MAX_SAFE_INTEGER;
    let maxId = 0;
    let count = 0;
    idSets.forEach((ids) => {
        ids.forEach((id) => {
            if (id < minId) {
                minId = id;
            }
            if (id > maxId) {
                maxId = id;
            }
            count++;
        });
    });

    const range = maxId - minId;

    // We use single byte array which is going to much more efficient than set
    // so here we allow array to have 75% of waste space (actually memory profiler shows set mem consumption is a lot larger),
    // which means if range is 400 and there are only 100 items - still use array
    const threshold = 0.25;

    if (count >= Math.max(1, range * threshold)) {
        // Use array
        const allIds = new Uint8Array(range + 1);
        let count = 0;
        idSets.forEach((ids) =>
            ids.forEach((id) => {
                if (allIds[id - minId] === 0) {
                    allIds[id - minId] = 1;
                    count++;
                }
            }),
        );
        return {
            has: (id: number) => allIds[id - minId] === 1,
            toArray: () => {
                const result = new Uint32Array(count);
                let j = 0;
                allIds.forEach((flag, i) => {
                    if (flag === 1) {
                        result[j++] = i + minId;
                    }
                });
                return result;
            },
        };
    } else {
        // Use set
        const allIds = new Set<number>();
        idSets.forEach((ids) => ids.forEach((id) => allIds.add(id)));

        return {
            has: (id: number) => allIds.has(id),
            toArray: () => new Uint32Array(allIds).sort(),
        };
    }
}

function areArraysEqual<A, B>(a: A[], b: B[], equal: (a: A, b: B) => boolean) {
    return a.length === b.length && a.every((e, i) => equal(e, b[i]));
}
