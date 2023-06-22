import { createNeutralHighlight, createTransparentHighlight, createColorSetHighlight } from "@novorender/web_app";
import { useRef, useEffect } from "react";

import { useAppSelector, useAppDispatch } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useHidden } from "contexts/hidden";
import { useHighlightCollections } from "contexts/highlightCollections";
import { useHighlighted } from "contexts/highlighted";
import { useObjectGroups, GroupStatus, ObjectGroup } from "contexts/objectGroups";
import { useSelectionBasket } from "contexts/selectionBasket";
import { useSceneId } from "hooks/useSceneId";
import { dataApi } from "app";

import { selectDefaultVisibility, ObjectVisibility, renderActions } from "..";

export function useHandleHighlights() {
    const {
        state: { view },
    } = useExplorerGlobals();
    const sceneId = useSceneId();
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
                    defaultHighlight:
                        defaultVisibility === ObjectVisibility.Neutral
                            ? createNeutralHighlight()
                            : defaultVisibility === ObjectVisibility.SemiTransparent
                            ? createTransparentHighlight(0.5)
                            : createTransparentHighlight(0),
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
                    hiddenGroups: [] as ObjectGroup[],
                    semiTransparent: [] as ObjectGroup[],
                }
            );

            view.modifyRenderState({
                highlights: {
                    groups: [
                        {
                            objectIds: new Uint32Array(highlighted.idArr).sort(),
                            rgbaTransform: createColorSetHighlight(highlighted.color),
                        },
                        {
                            objectIds: new Uint32Array(secondaryHighlight.idArr).sort(),
                            rgbaTransform: createColorSetHighlight(secondaryHighlight.color),
                        },
                        ...colored.map((group) => ({
                            objectIds: new Uint32Array(group.ids).sort(),
                            rgbaTransform: createColorSetHighlight(group.color),
                        })),
                        {
                            objectIds: new Uint32Array(hidden).sort(),
                            rgbaTransform: null,
                        },
                        ...hiddenGroups.map((group) => ({
                            objectIds: new Uint32Array([...group.ids]).sort(),
                            rgbaTransform: null,
                        })),
                        ...semiTransparent.map((group) => ({
                            objectIds: new Uint32Array([...group.ids]).sort(),
                            rgbaTransform: createTransparentHighlight(group.opacity),
                        })),
                    ],
                },
                // scene: {
                //     filter: {
                //         objectIds: new Uint32Array(
                //             new Set([...hidden.flatMap((group) => Array.from(group.ids))])
                //         ).sort(),
                //     },
                // },
            });
        }
    }, [view, dispatch, sceneId, highlighted, secondaryHighlight, hidden, groups, defaultVisibility, basket]);
}

async function fillActiveGroupIds(sceneId: string, groups: ObjectGroup[]): Promise<void> {
    const proms: Promise<void>[] = groups.map(async (group) => {
        if (group.status !== GroupStatus.Default && !group.ids) {
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