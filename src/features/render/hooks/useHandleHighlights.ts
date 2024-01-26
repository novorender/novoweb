import { createColorSetHighlight, createNeutralHighlight, createTransparentHighlight } from "@novorender/api";
import { useEffect, useRef } from "react";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useHidden } from "contexts/hidden";
import { useHighlightCollections } from "contexts/highlightCollections";
import { useHighlighted } from "contexts/highlighted";
import { GroupStatus, ObjectGroup, useObjectGroups } from "contexts/objectGroups";
import { useSelectionBasket } from "contexts/selectionBasket";
import { selectVisibleOutlineGroups } from "features/outlineLaser";
import { selectPropertyTreeGroups } from "features/propertyTree/slice";
import { useSceneId } from "hooks/useSceneId";
import { VecRGBA } from "utils/color";

import {
    CameraType,
    ObjectVisibility,
    renderActions,
    selectCameraType,
    selectDefaultVisibility,
    SelectionBasketMode,
    selectMainObject,
    selectSelectionBasketColor,
    selectSelectionBasketMode,
} from "..";

export function useHandleHighlights() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const sceneId = useSceneId();
    const mainObject = useAppSelector(selectMainObject);
    const highlighted = useHighlighted();
    const { secondaryHighlight, checklistsNew, checklistOngoing, checklistCompleted } = useHighlightCollections();
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
                (prev, group) => {
                    switch (group.status) {
                        case GroupStatus.Selected: {
                            prev.coloredGroups.push(group);
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
                    coloredGroups: [] as ObjectGroup[],
                    frozenGroups: [] as ObjectGroup[],
                    hiddenGroups: [] as { ids: Set<number> }[],
                    semiTransparent: [] as ObjectGroup[],
                }
            );

            const { coloredPropertyTreeGroups } = propertyTreeGroups.reduce(
                (prev, group) => {
                    switch (group.status) {
                        case GroupStatus.Selected: {
                            prev.coloredPropertyTreeGroups.push(group);
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
                    coloredPropertyTreeGroups: [] as { ids: { [key: number]: number }; color: VecRGBA }[],
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
                        ...coloredGroups.map((group) => ({
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? group.ids
                                    : basket.idArr.filter((id) => group.ids.has(id))
                            ).sort(),
                            action: createColorSetHighlight(group.color),
                        })),
                        ...coloredPropertyTreeGroups.map((group) => ({
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? Object.values(group.ids)
                                    : basket.idArr.filter((id) => group.ids[id] !== undefined)
                            ).sort(),
                            action: createColorSetHighlight(group.color),
                        })),
                        ...(cameraType === CameraType.Orthographic
                            ? outlineGroups.map((group) => ({
                                  objectIds: new Uint32Array(group.ids).sort(),
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
                                    ? checklistsNew.idArr
                                    : basket.idArr.filter((id) => checklistsNew.ids[id])
                            ).sort(),
                            action: createColorSetHighlight(checklistsNew.color),
                        },
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? checklistOngoing.idArr
                                    : basket.idArr.filter((id) => checklistOngoing.ids[id])
                            ).sort(),
                            action: createColorSetHighlight(checklistOngoing.color),
                        },
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? checklistCompleted.idArr
                                    : basket.idArr.filter((id) => checklistCompleted.ids[id])
                            ).sort(),
                            action: createColorSetHighlight(checklistCompleted.color),
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
        checklistsNew,
        checklistOngoing,
        checklistCompleted,
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
