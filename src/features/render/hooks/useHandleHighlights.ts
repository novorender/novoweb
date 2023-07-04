import { createColorSetHighlight, createNeutralHighlight, createTransparentHighlight } from "@novorender/web_app";
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

import { ObjectVisibility, renderActions, selectDefaultVisibility, selectMainObject } from "..";

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
                            ? createTransparentHighlight(0.5)
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

            const { colored, hiddenGroups, semiTransparent } = groups.reduceRight(
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
                        {
                            objectIds: new Uint32Array(
                                mainObject !== undefined ? highlighted.idArr.concat(mainObject) : highlighted.idArr
                            ).sort(),
                            action: createColorSetHighlight(highlighted.color),
                        },
                        {
                            objectIds: new Uint32Array(secondaryHighlight.idArr).sort(),
                            action: createColorSetHighlight(secondaryHighlight.color),
                        },
                        ...colored.map((group) => ({
                            objectIds: new Uint32Array(group.ids).sort(),
                            action: createColorSetHighlight(group.color),
                        })),
                        {
                            objectIds: new Uint32Array(allHidden).sort(),
                            action: "hide",
                        },
                        ...semiTransparent.map((group) => ({
                            objectIds: new Uint32Array([...group.ids]).sort(),
                            action: createTransparentHighlight(group.opacity),
                        })),
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
