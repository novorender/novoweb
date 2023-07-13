import { createNeutralHighlight, createRGBATransformHighlight, createTransparentHighlight } from "@novorender/web_app";
import { useEffect, useRef } from "react";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useHidden } from "contexts/hidden";
import { useHighlightCollections } from "contexts/highlightCollections";
import { useHighlighted } from "contexts/highlighted";
import { GroupStatus, ObjectGroup, useObjectGroups } from "contexts/objectGroups";
import { useSelectionBasket } from "contexts/selectionBasket";
import { useSceneId } from "hooks/useSceneId";

import {
    ObjectVisibility,
    SelectionBasketMode,
    renderActions,
    selectDefaultVisibility,
    selectMainObject,
    selectSelectionBasketColor,
    selectSelectionBasketMode,
} from "..";
import { VecRGB, VecRGBA } from "utils/color";

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

            const { colored, hiddenGroups, semiTransparent } = groups.reduce(
                (prev, group) => {
                    switch (group.status) {
                        case GroupStatus.Selected: {
                            prev.colored.push(group);
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
                    colored: [] as ObjectGroup[],
                    frozen: [] as ObjectGroup[],
                    hiddenGroups: [] as ObjectGroup[],
                    semiTransparent: [] as ObjectGroup[],
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
                                ? createColorTransform(basketColor.color)
                                : createNeutralHighlight(),
                        },
                        ...colored.map((group) => ({
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? group.ids
                                    : basket.idArr.filter((id) => group.ids.has(id))
                            ).sort(),
                            action: createColorTransform(group.color),
                        })),
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? secondaryHighlight.idArr
                                    : basket.idArr.filter((id) => secondaryHighlight.ids[id])
                            ).sort(),
                            action: createColorTransform(secondaryHighlight.color),
                        },
                        {
                            objectIds: new Uint32Array(
                                basketMode === SelectionBasketMode.Loose
                                    ? mainObject !== undefined
                                        ? highlighted.idArr.concat(mainObject)
                                        : highlighted.idArr
                                    : basket.idArr.filter((id) => id === mainObject || highlighted.ids[id])
                            ).sort(),
                            action: createColorTransform(highlighted.color),
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
        defaultVisibility,
        basket,
        mainObject,
        basketColor,
        basketMode,
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

function createColorTransform([r, g, b, a = 1]: VecRGB | VecRGBA) {
    return createRGBATransformHighlight({
        red: { scale: r, offset: r * 0.3 },
        green: { scale: g, offset: g * 0.3 },
        blue: { scale: b, offset: b * 0.3 },
        opacity: a,
    });
}
