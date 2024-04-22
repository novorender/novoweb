import {
    createColorSetHighlight,
    createNeutralHighlight,
    createTransparentHighlight,
    RenderStateHighlightGroup,
} from "@novorender/api";
import { useEffect, useRef } from "react";

import { dataApi } from "apis/dataV1";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useHidden } from "contexts/hidden";
import { useHighlightCollections } from "contexts/highlightCollections";
import { useHighlighted } from "contexts/highlighted";
import { GroupStatus, ObjectGroup, useObjectGroups } from "contexts/objectGroups";
import { useSelectionBasket } from "contexts/selectionBasket";
import { selectVisibleOutlineGroups } from "features/outlineLaser";
import { selectPropertyTreeGroups } from "features/propertyTree/slice";
import { useSceneId } from "hooks/useSceneId";
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
    const sceneId = useSceneId();
    const mainObject = useAppSelector(selectMainObject);
    const highlighted = useHighlighted();
    const { secondaryHighlight, selectedDeviation, formsNew, formsOngoing, formsCompleted } = useHighlightCollections();
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

    const id = useRef(0);

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
            await fillActiveGroupIds(sceneId, groups);
            dispatch(renderActions.removeLoadingHandle(loading));

            if (currentId !== id.current) {
                return;
            }

            const { coloredGroups, hiddenGroups, semiTransparent } = groups.reduce(
                (prev, group, idx) => {
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
                        default:
                            break;
                    }

                    return prev;
                },
                {
                    coloredGroups: {} as {
                        [color: string]: { ids: Set<number>; action: RenderStateHighlightGroup["action"]; idx: number };
                    },
                    frozenGroups: [] as ObjectGroup[],
                    hiddenGroups: [] as { ids: Set<number> }[],
                    semiTransparent: [] as ObjectGroup[],
                }
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
                }
            );

            const allHidden = objectIdSet([hidden, ...hiddenGroups.map((g) => g.ids)]);

            view.modifyRenderState({
                highlights: {
                    groups: [
                        ...(defaultVisibility === ObjectVisibility.Neutral
                            ? semiTransparent.map((group) => ({
                                  objectIds: new Uint32Array(group.ids).sort(),
                                  action: createTransparentHighlight(group.opacity),
                              }))
                            : []),
                        {
                            objectIds: allHidden.toArray(),
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
                                        : basket.idArr.filter((id) => group.ids.has(id))
                                ).sort(),
                                action: group.action,
                            })),
                        ...Object.values(coloredPropertyTreeGroups).map((group) => ({
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? group.ids
                                    : basket.idArr.filter((id) => group.ids.has(id))
                            ).sort(),
                            action: group.action,
                        })),
                        ...(cameraType === CameraType.Orthographic &&
                        viewMode !== ViewMode.FollowPath &&
                        viewMode !== ViewMode.Deviations
                            ? outlineGroups.map((group) => ({
                                  objectIds: new Uint32Array(group.ids).sort().filter((f) => !allHidden.has(f)),
                                  outlineColor: group.color,
                              }))
                            : []),
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? secondaryHighlight.idArr
                                    : basket.idArr.filter((id) => secondaryHighlight.ids[id])
                            ).sort(),
                            action: createColorSetHighlight(secondaryHighlight.color),
                        },
                        {
                            objectIds: new Uint32Array(selectedDeviation.idArr).sort(),
                            action: createNeutralHighlight(),
                        },
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? formsNew.idArr
                                    : basket.idArr.filter((id) => formsNew.ids[id])
                            ).sort(),
                            action: createColorSetHighlight(formsNew.color),
                        },
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? formsOngoing.idArr
                                    : basket.idArr.filter((id) => formsOngoing.ids[id])
                            ).sort(),
                            action: createColorSetHighlight(formsOngoing.color),
                        },
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? formsCompleted.idArr
                                    : basket.idArr.filter((id) => formsCompleted.ids[id])
                            ).sort(),
                            action: createColorSetHighlight(formsCompleted.color),
                        },
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? mainObject !== undefined
                                        ? highlighted.idArr.concat(mainObject)
                                        : highlighted.idArr
                                    : basket.idArr.filter((id) => id === mainObject || highlighted.ids[id])
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
        sceneId,
        highlighted,
        secondaryHighlight,
        formsNew,
        formsOngoing,
        formsCompleted,
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
        selectedDeviation,
        viewMode,
    ]);
}

async function fillActiveGroupIds(sceneId: string, groups: ObjectGroup[]): Promise<void> {
    const proms: Promise<void>[] = groups.map(async (group) => {
        if (group.status !== GroupStatus.None && !group.ids) {
            group.ids = new Set(
                await dataApi.getGroupIds(sceneId, group.id).catch(() => {
                    console.warn("failed to load ids for group - ", group.id);
                    return [] as number[];
                })
            );
        }
    });

    await Promise.all(proms);
    return;
}

/**
 * The idea is to use array (index is object ID) instead of set if ID range is
 * so array is not too big and pretty close or smaller than total ID count of the underlying sets.
 * @param idSets Array of object ID sets or arrays
 * @returns Sorted combined ID array
 */
function objectIdSet(idSets: (Set<number> | number[])[]) {
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
            })
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
