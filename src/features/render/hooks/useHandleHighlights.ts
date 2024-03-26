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

import {
    renderActions,
    selectCameraType,
    selectDefaultVisibility,
    selectMainObject,
    selectSelectionBasketColor,
    selectSelectionBasketMode,
} from "../renderSlice";
import { CameraType, ObjectVisibility, SelectionBasketMode } from "../types";

export function useHandleHighlights() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const sceneId = useSceneId();
    const mainObject = useAppSelector(selectMainObject);
    const highlighted = useHighlighted();
    const secondaryHighlight = useHighlightCollections()["secondaryHighlight"];
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
                            : "filter",
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

            const allHidden = new Set<number>(hidden);
            hiddenGroups.forEach((group) => group.ids.forEach((id) => allHidden.add(id)));

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
                            objectIds: new Uint32Array(allHidden).sort(),
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
                        ...(cameraType === CameraType.Orthographic
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
