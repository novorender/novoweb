import { vec4 } from "gl-matrix";
import { Bookmark } from "@novorender/data-js-api";

import { dataApi } from "app";
import { useAppDispatch } from "app/store";
import { ObjectGroup, objectGroupsActions, useDispatchObjectGroups, useLazyObjectGroups } from "contexts/objectGroups";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { hiddenGroupActions, useDispatchHidden } from "contexts/hidden";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useDispatchSelectionBasket, selectionBasketActions } from "contexts/selectionBasket";
import { followPathActions } from "features/followPath";
import { measureActions } from "features/measure";
import { CameraType, DeepWritable, ObjectVisibility, renderActions, SelectionBasketMode } from "slices/renderSlice";
import { areaActions } from "features/area";
import { pointLineActions } from "features/pointLine";
import { groupsActions } from "features/groups";
import { useSceneId } from "hooks/useSceneId";
import { manholeActions } from "features/manhole";
import { ExtendedMeasureEntity, ViewMode } from "types/misc";

export function useSelectBookmark() {
    const sceneId = useSceneId();
    const dispatchSelectionBasket = useDispatchSelectionBasket();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const objectGroups = useLazyObjectGroups();
    const dispatchObjectGroups = useDispatchObjectGroups();

    const {
        state: { view, scene, measureScene },
    } = useExplorerGlobals();

    const dispatch = useAppDispatch();

    const select = async (bookmark: Bookmark) => {
        const bmHiddenGroup = bookmark.objectGroups?.find((group) => !group.id && group.hidden);
        dispatchHidden(hiddenGroupActions.setIds((bmHiddenGroup?.ids as number[] | undefined) ?? []));

        const bmDefaultGroup = bookmark.objectGroups?.find((group) => !group.id && group.selected);
        const updatedObjectGroups = objectGroups.current.map((group) => {
            const bookmarked = bookmark.objectGroups?.find((bmGroup) => bmGroup.id === group.id);

            return {
                ...group,
                selected: bookmarked ? bookmarked.selected : false,
                hidden: bookmarked ? bookmarked.hidden : false,
            };
        });

        const add = Boolean(bookmark?.options?.addSelectedToSelectionBasket);
        if (add) {
            dispatchSelectionBasket(selectionBasketActions.set(bookmark.selectionBasket?.ids ?? []));
            dispatch(renderActions.setSelectionBasketMode(bookmark.selectionBasket?.mode ?? SelectionBasketMode.Loose));

            const highlighted = bmDefaultGroup?.ids ?? [];
            const [toAdd, toLoad] = updatedObjectGroups.reduce(
                (prev, group) => {
                    if (!group.selected) {
                        return prev;
                    }

                    if (group.ids) {
                        prev[0].push(group);
                    } else {
                        prev[1].push(group);
                    }

                    return prev;
                },
                [[], []] as [ObjectGroup[], ObjectGroup[]]
            );

            dispatchSelectionBasket(
                selectionBasketActions.add([...highlighted, ...toAdd.flatMap((group) => group.ids)])
            );

            dispatch(groupsActions.setLoadingIds(true));
            await Promise.all(
                toLoad
                    .filter((group) => !group.ids)
                    .map(async (group) => {
                        group.ids = await dataApi.getGroupIds(sceneId, group.id).catch(() => {
                            console.warn("failed to load ids for group - ", group.id);
                            return [];
                        });
                    })
            );
            dispatch(groupsActions.setLoadingIds(false));

            dispatchSelectionBasket(selectionBasketActions.add(toLoad.flatMap((group) => group.ids)));
            dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));
            dispatchObjectGroups(
                objectGroupsActions.set(updatedObjectGroups.map((group) => ({ ...group, selected: false })))
            );
            dispatchHighlighted(highlightActions.setIds([]));
        } else {
            if (bookmark.objectGroups) {
                const groups = bookmark.objectGroups;
                updatedObjectGroups.sort(
                    (a, b) => groups.findIndex((grp) => grp.id === a.id) - groups.findIndex((grp) => grp.id === b.id)
                );
            }

            dispatchHighlighted(highlightActions.setIds((bmDefaultGroup?.ids as number[] | undefined) ?? []));
            dispatchObjectGroups(objectGroupsActions.set(updatedObjectGroups));

            if (bookmark.selectionBasket) {
                dispatchSelectionBasket(selectionBasketActions.set(bookmark.selectionBasket.ids));
                dispatch(renderActions.setSelectionBasketMode(bookmark.selectionBasket.mode));
            } else {
                dispatchSelectionBasket(selectionBasketActions.set([]));
                dispatch(renderActions.setSelectionBasketMode(SelectionBasketMode.Loose));
            }

            if (bookmark.defaultVisibility !== undefined) {
                dispatch(renderActions.setDefaultVisibility(bookmark.defaultVisibility as ObjectVisibility));
            } else if (bookmark.selectedOnly !== undefined) {
                dispatch(
                    renderActions.setDefaultVisibility(
                        bookmark.selectedOnly ? ObjectVisibility.SemiTransparent : ObjectVisibility.Neutral
                    )
                );
            }
        }

        const main = bmDefaultGroup && bmDefaultGroup.ids?.length ? bmDefaultGroup.ids.slice(-1)[0] : undefined;
        dispatch(renderActions.setMainObject(main));

        if (bookmark.selectedMeasureEntities) {
            dispatch(measureActions.setSelectedEntities(bookmark.selectedMeasureEntities));
        } else if (bookmark.objectMeasurement) {
            if (!measureScene) {
                return;
            }

            const legacySnapTolerance = { edge: 0.032, segment: 0.12, face: 0.07, point: 0.032 };
            const entities = await Promise.all(
                bookmark.objectMeasurement.map(async (obj) => {
                    const entity = await measureScene?.pickMeasureEntity(obj.id, obj.pos, legacySnapTolerance);
                    return {
                        ...entity.entity,
                        settings: obj.settings,
                    } as ExtendedMeasureEntity;
                })
            );

            dispatch(measureActions.setSelectedEntities(entities));
        } else if (bookmark.measurement) {
            dispatch(
                measureActions.setSelectedEntities(
                    bookmark.measurement.slice(0, 2).map((pt) => ({ ObjectId: -1, drawKind: "vertex", parameter: pt }))
                )
            );
        } else {
            dispatch(measureActions.setSelectedEntities([]));
        }

        if (bookmark.area) {
            dispatch(areaActions.setPoints(bookmark.area.pts));
        } else {
            dispatch(areaActions.setPoints([]));
        }

        if (bookmark.pointLine) {
            dispatch(pointLineActions.setPoints(bookmark.pointLine.pts));
        } else {
            dispatch(pointLineActions.setPoints([]));
        }

        dispatch(manholeActions.initFromBookmark(bookmark.manhole));

        if (bookmark.clippingPlanes) {
            view?.applySettings({ clippingPlanes: { ...bookmark.clippingPlanes, highlight: -1 } });
            dispatch(
                renderActions.setClippingBox({
                    ...bookmark.clippingPlanes,
                    baseBounds: bookmark.clippingPlanes.bounds,
                    highlight: -1,
                    defining: false,
                })
            );
        } else {
            dispatch(renderActions.resetClippingBox());
        }

        if (bookmark.clippingVolume) {
            const { enabled, mode, planes } = bookmark.clippingVolume;
            dispatch(
                renderActions.setClippingPlanes({
                    enabled,
                    mode,
                    planes: Array.from(planes) as vec4[],
                    baseW: planes[0] && planes[0][3] !== undefined ? planes[0][3] : 0,
                })
            );
        } else {
            dispatch(renderActions.setClippingPlanes({ planes: [], enabled: false, mode: "union" }));
        }

        if (bookmark.ortho) {
            dispatch(renderActions.setCamera({ type: CameraType.Orthographic, params: bookmark.ortho }));
        } else if (bookmark.camera) {
            dispatch(renderActions.setCamera({ type: CameraType.Flight, goTo: bookmark.camera }));
        }

        if (bookmark.grid) {
            if (!view) {
                return;
            }

            dispatch(renderActions.setGridDefaults({ enabled: bookmark.grid.enabled }));
            dispatch(renderActions.setGrid(bookmark.grid as DeepWritable<typeof bookmark.grid>));
        }

        if (bookmark.followPath) {
            if (!scene) {
                return;
            }
            const { profile, currentCenter } = bookmark.followPath;

            dispatch(followPathActions.setProfile(String(profile)));
            dispatch(followPathActions.setView2d(Boolean(bookmark.ortho)));
            dispatch(followPathActions.setShowGrid(Boolean(bookmark.grid?.enabled)));
            dispatch(followPathActions.setCurrentCenter(currentCenter as [number, number, number]));

            if (bookmark.ortho?.far) {
                dispatch(followPathActions.setClipping(bookmark.ortho.far));
            }

            if (bookmark.followPath.currentCenter) {
                dispatch(followPathActions.setPtHeight(bookmark.followPath.currentCenter[1]));
            } else if (bookmark.ortho) {
                dispatch(
                    followPathActions.setPtHeight(
                        bookmark.ortho.referenceCoordSys ? bookmark.ortho.referenceCoordSys[13] : undefined
                    )
                );
            } else {
                dispatch(followPathActions.setPtHeight(bookmark.camera ? bookmark.camera.position[1] : undefined));
            }

            if ("parametric" in bookmark.followPath) {
                dispatch(followPathActions.setSelectedPositions(bookmark.followPath.parametric));
                dispatch(followPathActions.setGoToRouterPath(`/followPos`));
            } else {
                const ids = "ids" in bookmark.followPath ? bookmark.followPath.ids : [bookmark.followPath.id];
                dispatch(followPathActions.setSelectedIds(ids));
                dispatch(followPathActions.setGoToRouterPath(`/followIds`));
            }
        }

        if (bookmark.subtrees) {
            dispatch(renderActions.setSubtreesFromBookmark(bookmark.subtrees));
        }

        if (bookmark.viewMode) {
            dispatch(renderActions.setViewMode(bookmark.viewMode));
        } else {
            dispatch(renderActions.setViewMode(ViewMode.Regular));
        }
    };

    return select;
}
