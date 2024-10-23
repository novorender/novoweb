import {
    createColorSetHighlight,
    createNeutralHighlight,
    createTransparentHighlight,
    ObjectId,
    RenderStateHighlightGroup,
} from "@novorender/api";
import { useEffect, useMemo, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useHidden } from "contexts/hidden";
import { useHighlightCollections } from "contexts/highlightCollections";
import { useHighlighted } from "contexts/highlighted";
import { GroupStatus, ObjectGroup, useObjectGroups } from "contexts/objectGroups";
import { useSelectionBasket } from "contexts/selectionBasket";
import { selectAllDeviationGroups, selectSelectedProfile } from "features/deviations";
import { OutlineGroup, selectVisibleOutlineGroups } from "features/outlineLaser";
import { selectPropertyTreeGroups } from "features/propertyTree/slice";
import { useFillGroupIds } from "hooks/useFillGroupIds";
import { ViewMode } from "types/misc";
import { VecRGB, VecRGBA } from "utils/color";

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

const TRANSPARENT_HIGHLIGHT_1 = createTransparentHighlight(1);
const NEUTRAL_HIGHLIGHT = createNeutralHighlight();

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
    const deviationProfileIndex = useAppSelector(selectSelectedProfile)?.index;
    const deviationLegendGroups = useAppSelector(selectAllDeviationGroups);

    const id = useRef(0);

    // Not using WeakMap for caching, because I'm afraid old groups may linger somewhere
    // like prev renderState / redux history / local component state. And cache entries may be pretty expensive.
    // Entire concept relies on all groups (object/outline/property tree) ID lists/maps to be immutable.
    // Memory wise even though we save things in cache I hope we may reduce memory pressure:
    // - Heavy things are ID maps/lists. Source ID maps/lists are stored in the app anyway.
    //   Result ID arrays are stored in view.renderState anyway.
    //   So at least we don't store anything new.
    // - Without cache we rebuild everything, so during rebuild when we have both old and new state -
    //   we consume prev_state + current_state memory.
    //   Cache allows to rebuild only changed parts so we gonna stay below previous consumption unless EVERYTHING changes at once.
    const cacheRef = useRef({
        coloredGroups: new Map<string, { idLists: Iterable<ObjectId>[]; highlightGroup: RenderStateHighlightGroup }>(),
        coloredPropertyTreeGroups: new Map<
            string,
            { idLists: { [key: number]: ObjectId }[]; highlightGroup: RenderStateHighlightGroup }
        >(),
        basketMode,
        basketIdArr: [] as ObjectId[],
        frozenGroups: {
            idLists: [] as Iterable<ObjectId>[],
            highlightGroup: undefined as undefined | RenderStateHighlightGroup,
        },
        hiddenGroups: {
            idLists: [] as Iterable<ObjectId>[],
            highlightGroup: undefined as undefined | RenderStateHighlightGroup,
        },
        hiddenPropertyTreeGroups: {
            idLists: [] as { [key: number]: ObjectId }[],
            highlightGroup: undefined as undefined | RenderStateHighlightGroup,
        },
        hidden: {
            ids: [] as number[],
            highlightGroup: undefined as undefined | RenderStateHighlightGroup,
        },
        semiTransparent: new Map<ObjectGroup, RenderStateHighlightGroup>(),
        outlineGroups: new Map<OutlineGroup, RenderStateHighlightGroup>(),
        coloredDeviationGroups: {
            idLists: [] as Iterable<ObjectId>[],
            profileIndex: -1,
            highlightGroup: undefined as undefined | RenderStateHighlightGroup,
        },
    });

    // Cache simple things and whatever doesn't rely on groups with useMemo
    const basketHighlightGroup = useMemo(() => {
        return {
            objectIds: new Uint32Array(basket.idArr).sort(),
            action: basketColor.use ? createColorSetHighlight(basketColor.color) : NEUTRAL_HIGHLIGHT,
        };
    }, [basket.idArr, basketColor]);

    const secondaryHighlightGroup = useMemo(() => {
        return {
            objectIds: new Uint32Array(
                basketMode === SelectionBasketMode.Loose
                    ? secondaryHighlight.idArr
                    : basket.idArr.filter((id) => secondaryHighlight.ids[id]),
            ).sort(),
            action: createColorSetHighlight(secondaryHighlight.color),
        };
    }, [basket.idArr, basketMode, secondaryHighlight]);

    const formsNewHighlightGroup = useMemo(() => {
        return {
            objectIds: new Uint32Array(
                basketMode === SelectionBasketMode.Loose
                    ? formsNew.idArr
                    : basket.idArr.filter((id) => formsNew.ids[id]),
            ).sort(),
            action: createColorSetHighlight(formsNew.color),
        };
    }, [basket.idArr, basketMode, formsNew]);

    const formsOngoingHighlightGroup = useMemo(() => {
        return {
            objectIds: new Uint32Array(
                basketMode === SelectionBasketMode.Loose
                    ? formsOngoing.idArr
                    : basket.idArr.filter((id) => formsOngoing.ids[id]),
            ).sort(),
            action: createColorSetHighlight(formsOngoing.color),
        };
    }, [basket.idArr, basketMode, formsOngoing]);

    const formsCompletedHighlightGroup = useMemo(() => {
        return {
            objectIds: new Uint32Array(
                basketMode === SelectionBasketMode.Loose
                    ? formsCompleted.idArr
                    : basket.idArr.filter((id) => formsCompleted.ids[id]),
            ).sort(),
            action: createColorSetHighlight(formsCompleted.color),
        };
    }, [basket.idArr, basketMode, formsCompleted]);

    const clashObjects1HighlightGroup = useMemo(() => {
        return {
            objectIds: new Uint32Array(
                basketMode === SelectionBasketMode.Loose
                    ? clashObjects1.idArr
                    : basket.idArr.filter((id) => clashObjects1.ids[id]),
            ).sort(),
            action: createColorSetHighlight(clashObjects1.color),
        };
    }, [basket.idArr, basketMode, clashObjects1]);

    const clashObjects2HighlightGroup = useMemo(() => {
        return {
            objectIds: new Uint32Array(
                basketMode === SelectionBasketMode.Loose
                    ? clashObjects2.idArr
                    : basket.idArr.filter((id) => clashObjects2.ids[id]),
            ).sort(),
            action: createColorSetHighlight(clashObjects2.color),
        };
    }, [basket.idArr, basketMode, clashObjects2]);

    const primaryHighlightGroup = useMemo(() => {
        return {
            objectIds: new Uint32Array(
                basketMode === SelectionBasketMode.Loose
                    ? mainObject !== undefined
                        ? highlighted.idArr.concat(mainObject)
                        : highlighted.idArr
                    : basket.idArr.filter((id) => id === mainObject || highlighted.ids[id]),
            ).sort(),
            action: createColorSetHighlight(highlighted.color),
            outlineColor: [highlighted.color[0], highlighted.color[1], highlighted.color[3]],
        };
    }, [basket.idArr, basketMode, highlighted, mainObject]);

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

            const cache = cacheRef.current;

            const { coloredDeviationGroups, coloredGroups, frozenGroups, hiddenGroups, semiTransparent } =
                groups.reduce(
                    (prev, group, idx) => {
                        if (viewMode === ViewMode.Deviations) {
                            for (const g of deviationLegendGroups) {
                                if (g.isDeviationColored && g.id === group.id && g.status !== GroupStatus.Hidden) {
                                    prev.coloredDeviationGroups.push(group.ids);
                                    return prev;
                                }
                            }
                        }

                        switch (group.status) {
                            case GroupStatus.Selected: {
                                const colorStr = group.color.toString();

                                let colorGroups = prev.coloredGroups.get(colorStr);
                                if (!colorGroups) {
                                    colorGroups = {
                                        idLists: [],
                                        index: idx,
                                        color: group.color,
                                        colorStr,
                                    };
                                    prev.coloredGroups.set(colorStr, colorGroups);
                                }
                                colorGroups.idLists.push(group.ids);
                                break;
                            }
                            case GroupStatus.Hidden: {
                                if (!group.opacity) {
                                    prev.hiddenGroups.push(group.ids);
                                } else {
                                    prev.semiTransparent.push(group);
                                }
                                break;
                            }
                            case GroupStatus.Frozen: {
                                prev.frozenGroups.push(group.ids);
                                break;
                            }
                            default:
                                break;
                        }

                        return prev;
                    },
                    {
                        coloredGroups: new Map<
                            string,
                            {
                                idLists: Iterable<ObjectId>[];
                                index: number;
                                color: VecRGB | VecRGBA;
                                colorStr: string;
                            }
                        >(),
                        frozenGroups: [] as Iterable<ObjectId>[],
                        hiddenGroups: [] as Iterable<ObjectId>[],
                        semiTransparent: [] as ObjectGroup[],
                        coloredDeviationGroups: [] as Iterable<ObjectId>[],
                    },
                );

            const { coloredPropertyTreeGroups, hiddenPropertyTreeGroups } = propertyTreeGroups.reduce(
                (prev, group) => {
                    switch (group.status) {
                        case GroupStatus.Selected: {
                            const colorStr = group.color.toString();

                            let colorGroups = prev.coloredPropertyTreeGroups.get(colorStr);
                            if (!colorGroups) {
                                colorGroups = {
                                    color: group.color,
                                    colorStr,
                                    ids: [],
                                };
                                prev.coloredPropertyTreeGroups.set(colorStr, colorGroups);
                            }
                            colorGroups.ids.push(group.ids);
                            break;
                        }
                        case GroupStatus.Hidden: {
                            prev.hiddenPropertyTreeGroups.push(group.ids);
                            break;
                        }
                        default:
                            break;
                    }

                    return prev;
                },
                {
                    coloredPropertyTreeGroups: new Map<
                        string,
                        {
                            ids: { [key: number]: number }[];
                            color: VecRGBA;
                            colorStr: string;
                        }
                    >(),
                    hiddenPropertyTreeGroups: [] as { [key: number]: number }[],
                },
            );

            // colored highlight groups
            keepMapKeysOfAnotherMap(cache.coloredGroups, coloredGroups);
            const coloredHighlightGroups = [...coloredGroups.values()]
                .sort((a, b) => a.index - b.index)
                .map(({ idLists, color, colorStr }) => {
                    let cacheEntry = cache.coloredGroups.get(colorStr);
                    if (
                        !cacheEntry ||
                        basketMode !== cache.basketMode ||
                        basket.idArr !== cache.basketIdArr ||
                        !areArraysEqual(cacheEntry.idLists, idLists)
                    ) {
                        const ids = objectIdSet(idLists);
                        cacheEntry = {
                            idLists,
                            highlightGroup: {
                                objectIds:
                                    basketMode === SelectionBasketMode.Loose
                                        ? ids.toArray()
                                        : new Uint32Array(basket.idArr.filter((id) => ids.has(id))).sort(),
                                action: createColorSetHighlight(color),
                            },
                        };
                        cache.coloredGroups.set(colorStr, cacheEntry);
                    }
                    return cacheEntry.highlightGroup;
                });

            // colored deviation groups
            if (typeof deviationProfileIndex === "number") {
                if (
                    !cache.coloredDeviationGroups.highlightGroup ||
                    cache.coloredDeviationGroups.profileIndex !== deviationProfileIndex ||
                    !areArraysEqual(cache.coloredDeviationGroups.idLists, coloredDeviationGroups)
                ) {
                    cache.coloredDeviationGroups.profileIndex = deviationProfileIndex;
                    cache.coloredDeviationGroups.idLists = coloredDeviationGroups;
                    cache.coloredDeviationGroups.highlightGroup = {
                        objectIds: objectIdSet(coloredDeviationGroups).toArray(),
                        action: TRANSPARENT_HIGHLIGHT_1,
                        pointVisualization: {
                            kind: "deviation" as const,
                            index: deviationProfileIndex,
                        },
                    };
                }
            } else {
                cache.coloredDeviationGroups.profileIndex = -1;
                cache.coloredDeviationGroups.idLists = [];
                cache.coloredDeviationGroups.highlightGroup = undefined;
            }

            // semi transparent
            const semiTransparentHighlightGroups: RenderStateHighlightGroup[] = [];
            if (defaultVisibility === ObjectVisibility.Neutral) {
                keepMapKeys(cache.semiTransparent, semiTransparent);
                for (const group of semiTransparent) {
                    let highlight = cache.semiTransparent.get(group);
                    if (!highlight) {
                        highlight = {
                            objectIds: new Uint32Array(group.ids).sort(),
                            action: createTransparentHighlight(group.opacity),
                        };
                        cache.semiTransparent.set(group, highlight);
                    }
                    semiTransparentHighlightGroups.push(highlight);
                }
            } else {
                cache.semiTransparent.clear();
            }

            // outline groups
            const outlineHighlightGroups: RenderStateHighlightGroup[] = [];
            if (
                cameraType === CameraType.Orthographic &&
                viewMode !== ViewMode.FollowPath &&
                viewMode !== ViewMode.Deviations
            ) {
                keepMapKeys(cache.outlineGroups, outlineGroups);
                for (const group of outlineGroups) {
                    let highlight = cache.outlineGroups.get(group);
                    if (!highlight) {
                        highlight = {
                            objectIds: new Uint32Array(group.ids).sort(),
                            action: NEUTRAL_HIGHLIGHT, // ???
                            outlineColor: group.color,
                        };
                        cache.outlineGroups.set(group, highlight);
                    }
                    outlineHighlightGroups.push(highlight);
                }
            } else {
                cache.outlineGroups.clear();
            }

            // colored property tree groups
            keepMapKeysOfAnotherMap(cache.coloredPropertyTreeGroups, coloredPropertyTreeGroups);
            const coloredPropertyTreeHighlightGroups = coloredPropertyTreeGroups
                .values()
                .map(({ ids, color, colorStr }) => {
                    let cacheEntry = cache.coloredPropertyTreeGroups.get(colorStr);
                    if (
                        !cacheEntry ||
                        basket.idArr !== cache.basketIdArr ||
                        basketMode !== cache.basketMode ||
                        !areArraysEqual(cacheEntry.idLists, ids)
                    ) {
                        const idSet = objectIdSet(ids.map((obj) => Object.values(obj)));
                        cacheEntry = {
                            idLists: ids,
                            highlightGroup: {
                                objectIds:
                                    basketMode === SelectionBasketMode.Loose
                                        ? idSet.toArray()
                                        : basket.idArr.filter((id) => idSet.has(id)),
                                action: createColorSetHighlight(color),
                            },
                        };
                        cache.coloredPropertyTreeGroups.set(colorStr, cacheEntry);
                    }
                    return cacheEntry.highlightGroup;
                });

            // hidden groups
            if (!cache.hiddenGroups.highlightGroup || !areArraysEqual(cache.hiddenGroups.idLists, hiddenGroups)) {
                cache.hiddenGroups.idLists = hiddenGroups;
                cache.hiddenGroups.highlightGroup = {
                    objectIds: objectIdSet(hiddenGroups).toArray(),
                    action: "hide",
                };
            }

            // hidden property tree groups
            if (
                !cache.hiddenPropertyTreeGroups.highlightGroup ||
                !areArraysEqual(cache.hiddenPropertyTreeGroups.idLists, hiddenPropertyTreeGroups)
            ) {
                cache.hiddenPropertyTreeGroups.idLists = hiddenPropertyTreeGroups;
                cache.hiddenPropertyTreeGroups.highlightGroup = {
                    objectIds: objectIdSet(hiddenPropertyTreeGroups.map((ids) => Object.values(ids))).toArray(),
                    action: "hide",
                };
            }

            // hidden
            if (cache.hidden.ids !== hidden) {
                cache.hidden.ids = hidden;
                cache.hidden.highlightGroup = {
                    objectIds: objectIdSet([hidden]).toArray(),
                    action: "hide",
                };
            }

            // frozen
            if (!cache.frozenGroups.highlightGroup || !areArraysEqual(cache.frozenGroups.idLists, frozenGroups)) {
                cache.frozenGroups.idLists = frozenGroups;
                cache.frozenGroups.highlightGroup = {
                    objectIds: objectIdSet(frozenGroups).toArray(),
                    action: "filter",
                };
            }

            cache.basketMode = basketMode;
            cache.basketIdArr = basket.idArr;

            view.modifyRenderState({
                highlights: {
                    groups: [
                        ...semiTransparentHighlightGroups,
                        ...outlineHighlightGroups,
                        cache.frozenGroups.highlightGroup,
                        cache.hiddenGroups.highlightGroup,
                        cache.hiddenPropertyTreeGroups.highlightGroup,
                        cache.hidden.highlightGroup,
                        ...coloredHighlightGroups,
                        ...coloredPropertyTreeHighlightGroups,
                        cache.coloredDeviationGroups.highlightGroup,
                        secondaryHighlightGroup,
                        formsNewHighlightGroup,
                        formsOngoingHighlightGroup,
                        formsCompletedHighlightGroup,
                        clashObjects1HighlightGroup,
                        clashObjects2HighlightGroup,
                        primaryHighlightGroup,
                    ].filter(Boolean),
                },
            });
        }
    }, [
        view,
        dispatch,
        secondaryHighlightGroup,
        formsNewHighlightGroup,
        formsOngoingHighlightGroup,
        formsCompletedHighlightGroup,
        clashObjects1HighlightGroup,
        clashObjects2HighlightGroup,
        basketHighlightGroup,
        primaryHighlightGroup,
        hidden,
        groups,
        propertyTreeGroups,
        defaultVisibility,
        basket,
        basketMode,
        outlineGroups,
        cameraType,
        viewMode,
        fillGroupIds,
        deviationProfileIndex,
        deviationLegendGroups,
    ]);
}

/**
 * The idea is to use array (index is object ID) instead of set if ID range is
 * so array is not too big and pretty close or smaller than total ID count of the underlying sets.
 * @param idSets Array of object ID sets or arrays
 * @returns Sorted combined ID array
 */
function objectIdSet(idSets: Iterable<number>[]) {
    // Find object ID range
    let minId = Number.MAX_SAFE_INTEGER;
    let maxId = 0;
    let count = 0;
    idSets.forEach((ids) => {
        for (const id of ids) {
            if (id < minId) {
                minId = id;
            }
            if (id > maxId) {
                maxId = id;
            }
            count++;
        }
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
        idSets.forEach((ids) => {
            for (const id of ids) {
                if (allIds[id - minId] === 0) {
                    allIds[id - minId] = 1;
                    count++;
                }
            }
        });
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
        idSets.forEach((ids) => {
            for (const id of ids) {
                allIds.add(id);
            }
        });

        return {
            has: (id: number) => allIds.has(id),
            toArray: () => new Uint32Array(allIds).sort(),
        };
    }
}

function areArraysEqual<T>(a: T[], b: T[]) {
    return a.length === b.length && a.every((e, i) => e === b[i]);
}

function keepMapKeys<K, T>(cache: Map<K, T>, keys: K[]) {
    cache.forEach((_, k) => {
        if (!keys.includes(k)) {
            cache.delete(k);
        }
    });
}

function keepMapKeysOfAnotherMap<K, T>(cache: Map<K, T>, anotherMapOrSet: Map<K, unknown> | Set<K>) {
    cache.forEach((_, k) => {
        if (!anotherMapOrSet.has(k)) {
            cache.delete(k);
        }
    });
}
