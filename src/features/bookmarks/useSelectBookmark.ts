import { Bookmark } from "@novorender/data-js-api";
import { ClippingMode } from "@novorender/api";
import { mat3, quat, vec4 } from "gl-matrix";
import { useCallback } from "react";

import { dataApi } from "app";
import { useAppDispatch } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { hiddenActions, useDispatchHidden } from "contexts/hidden";
import {
    HighlightCollection,
    highlightCollectionsActions,
    useDispatchHighlightCollections,
} from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import {
    GroupStatus,
    ObjectGroup,
    objectGroupsActions,
    useDispatchObjectGroups,
    useLazyObjectGroups,
} from "contexts/objectGroups";
import { selectionBasketActions, useDispatchSelectionBasket } from "contexts/selectionBasket";
import { areaActions } from "features/area";
import { followPathActions } from "features/followPath";
import { groupsActions } from "features/groups";
import { imagesActions } from "features/images";
import { manholeActions } from "features/manhole";
import { measureActions } from "features/measure";
import { pointLineActions } from "features/pointLine";
import { CameraType, ObjectVisibility, SelectionBasketMode, renderActions } from "features/render";
import { flip, flipGLtoCadQuat } from "features/render/utils";
import { useSceneId } from "hooks/useSceneId";
import { ExtendedMeasureEntity, ViewMode } from "types/misc";

export function useSelectBookmark() {
    const sceneId = useSceneId();
    const dispatchSelectionBasket = useDispatchSelectionBasket();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const dispatchHidden = useDispatchHidden();
    const objectGroups = useLazyObjectGroups();
    const dispatchObjectGroups = useDispatchObjectGroups();

    const {
        state: { measureScene },
    } = useExplorerGlobals();

    const dispatch = useAppDispatch();

    const selectExplorerState = useCallback(
        async (bookmark: NonNullable<Bookmark["explorerState"]>) => {
            dispatch(renderActions.selectBookmark(bookmark));

            const { objects, groups } = bookmark;
            dispatchHidden(hiddenActions.setIds(objects.hidden.ids));
            const updatedGroups = getUpdatedGroups(objectGroups.current, groups);

            if (!bookmark.options.addToSelectionBasket) {
                dispatchHighlighted(highlightActions.setIds(objects.highlighted.ids));
                dispatchSelectionBasket(selectionBasketActions.set(objects.selectionBasket.ids));
                dispatchHighlightCollections(
                    highlightCollectionsActions.setIds(
                        HighlightCollection.SecondaryHighlight,
                        objects.highlightCollections.secondaryHighlight.ids
                    )
                );
                dispatchObjectGroups(
                    objectGroupsActions.set(
                        updatedGroups.sort(
                            (a, b) =>
                                groups.findIndex((grp) => grp.id === a.id) - groups.findIndex((grp) => grp.id === b.id)
                        )
                    )
                );
            } else {
                const [toAdd, toLoad] = updatedGroups.reduce(
                    (prev, group) => {
                        if (group.status !== GroupStatus.Selected) {
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

                dispatchSelectionBasket(selectionBasketActions.set(objects.selectionBasket.ids));
                dispatchSelectionBasket(selectionBasketActions.add(objects.highlighted.ids));
                dispatchSelectionBasket(
                    selectionBasketActions.add(objects.highlightCollections.secondaryHighlight.ids)
                );
                dispatchSelectionBasket(selectionBasketActions.add(toAdd.flatMap((group) => Array.from(group.ids))));

                dispatch(groupsActions.setLoadingIds(true));
                await Promise.all(
                    toLoad
                        .filter((group) => !group.ids)
                        .map(async (group) => {
                            const ids = await dataApi.getGroupIds(sceneId, group.id).catch(() => {
                                console.warn("failed to load ids for group - ", group.id);
                                return [] as number[];
                            });

                            group.ids = new Set(ids);
                        })
                );
                dispatch(groupsActions.setLoadingIds(false));

                console.log(toLoad);

                dispatchSelectionBasket(selectionBasketActions.add(toLoad.flatMap((group) => Array.from(group.ids))));
                dispatchObjectGroups(
                    objectGroupsActions.set(
                        updatedGroups.map((group) =>
                            group.status === GroupStatus.Selected ? { ...group, status: GroupStatus.None } : group
                        )
                    )
                );
                dispatchHighlighted(highlightActions.setIds([]));
                dispatchHighlightCollections(highlightCollectionsActions.clearAll());
            }
        },
        [
            dispatch,
            dispatchHidden,
            dispatchHighlighted,
            dispatchHighlightCollections,
            dispatchObjectGroups,
            dispatchSelectionBasket,
            objectGroups,
            sceneId,
        ]
    );

    const selectLegacy = useCallback(
        async (bookmark: Bookmark) => {
            dispatch(imagesActions.setActiveImage(undefined));

            const bmHiddenGroup = bookmark.objectGroups?.find((group) => !group.id && group.hidden);
            dispatchHidden(hiddenActions.setIds((bmHiddenGroup?.ids as number[] | undefined) ?? []));

            const bmDefaultGroup = bookmark.objectGroups?.find((group) => !group.id && group.selected);
            const updatedObjectGroups = objectGroups.current.map((group) => {
                const bookmarked = bookmark.objectGroups?.find((bmGroup) => bmGroup.id === group.id);

                return {
                    ...group,
                    status: bookmarked?.selected
                        ? GroupStatus.Selected
                        : bookmarked?.hidden
                        ? GroupStatus.Hidden
                        : GroupStatus.None,
                };
            });

            const add = Boolean(bookmark?.options?.addSelectedToSelectionBasket);
            if (add) {
                dispatchSelectionBasket(selectionBasketActions.set(bookmark.selectionBasket?.ids ?? []));
                dispatch(
                    renderActions.setSelectionBasketMode(bookmark.selectionBasket?.mode ?? SelectionBasketMode.Loose)
                );

                const highlighted = bmDefaultGroup?.ids ?? [];
                const [toAdd, toLoad] = updatedObjectGroups.reduce(
                    (prev, group) => {
                        if (group.status !== GroupStatus.Selected) {
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
                    selectionBasketActions.add([...highlighted, ...toAdd.flatMap((group) => Array.from(group.ids))])
                );

                dispatch(groupsActions.setLoadingIds(true));
                await Promise.all(
                    toLoad
                        .filter((group) => !group.ids)
                        .map(async (group) => {
                            const ids = await dataApi.getGroupIds(sceneId, group.id).catch(() => {
                                console.warn("failed to load ids for group - ", group.id);
                                return [] as number[];
                            });

                            group.ids = new Set(ids);
                        })
                );
                dispatch(groupsActions.setLoadingIds(false));

                dispatchSelectionBasket(selectionBasketActions.add(toLoad.flatMap((group) => Array.from(group.ids))));
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));
                dispatchObjectGroups(
                    objectGroupsActions.set(
                        updatedObjectGroups.map((group) => ({ ...group, status: GroupStatus.None }))
                    )
                );
                dispatchHighlighted(highlightActions.setIds([]));
                dispatchHighlightCollections(highlightCollectionsActions.clearAll());
            } else {
                if (bookmark.objectGroups) {
                    const groups = bookmark.objectGroups;
                    updatedObjectGroups.sort(
                        (a, b) =>
                            groups.findIndex((grp) => grp.id === a.id) - groups.findIndex((grp) => grp.id === b.id)
                    );
                }

                dispatchHighlighted(highlightActions.setIds((bmDefaultGroup?.ids as number[] | undefined) ?? []));
                dispatchObjectGroups(objectGroupsActions.set(updatedObjectGroups));

                if (bookmark.highlightCollections?.secondaryHighlight) {
                    dispatchHighlightCollections(
                        highlightCollectionsActions.setIds(
                            HighlightCollection.SecondaryHighlight,
                            bookmark.highlightCollections.secondaryHighlight.ids
                        )
                    );
                } else {
                    dispatchHighlightCollections(
                        highlightCollectionsActions.setIds(HighlightCollection.SecondaryHighlight, [])
                    );
                }

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
                        const entity = await measureScene?.pickMeasureEntity(
                            obj.id,
                            flip(obj.pos),
                            legacySnapTolerance
                        );
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
                        bookmark.measurement
                            .slice(0, 2)
                            .map((pt) => ({ ObjectId: -1, drawKind: "vertex", parameter: flip(pt) }))
                    )
                );
            } else {
                dispatch(measureActions.setSelectedEntities([]));
            }

            if (bookmark.area) {
                dispatch(areaActions.setPoints(bookmark.area.pts.map(([pt, normal]) => [flip(pt), flip(normal)])));
            } else {
                dispatch(areaActions.setPoints([]));
            }

            if (bookmark.pointLine) {
                dispatch(pointLineActions.setPoints(bookmark.pointLine.pts.map((pt) => flip(pt))));
            } else {
                dispatch(pointLineActions.setPoints([]));
            }

            dispatch(manholeActions.initFromLegacyBookmark(bookmark.manhole));

            if (bookmark.clippingPlanes?.enabled) {
                const makePlane = (p: vec4) => {
                    return {
                        normalOffset: p,
                        baseW: p[3],
                        color: vec4.fromValues(0, 1, 0, 0.2),
                    };
                };
                const min = bookmark.clippingPlanes.bounds.min;
                const max = bookmark.clippingPlanes.bounds.max;
                let planes: { normalOffset: vec4; baseW: number; color: vec4 }[] = [];

                if (bookmark.clippingPlanes.inside) {
                    planes = [
                        makePlane(vec4.fromValues(1, 0, 0, min[0])),
                        makePlane(vec4.fromValues(0, 1, 0, -max[2])),
                        makePlane(vec4.fromValues(0, 0, 1, min[1])),
                        makePlane(vec4.fromValues(-1, 0, 0, -max[0])),
                        makePlane(vec4.fromValues(0, -1, 0, min[2])),
                        makePlane(vec4.fromValues(0, 0, -1, -max[1])),
                    ];
                } else {
                    planes = [
                        makePlane(vec4.fromValues(-1, 0, 0, -min[0])),
                        makePlane(vec4.fromValues(0, -1, 0, max[2])),
                        makePlane(vec4.fromValues(0, 0, -1, -min[1])),
                        makePlane(vec4.fromValues(1, 0, 0, max[0])),
                        makePlane(vec4.fromValues(0, 1, 0, -min[2])),
                        makePlane(vec4.fromValues(0, 0, 1, max[1])),
                    ];
                }

                dispatch(
                    renderActions.setClippingPlanes({
                        planes,
                        enabled: bookmark.clippingPlanes.enabled,
                        mode: bookmark.clippingPlanes.inside ? ClippingMode.intersection : ClippingMode.union,
                        draw: false,
                    })
                );
            } else if (bookmark.clippingVolume?.enabled) {
                const { enabled, mode, planes } = bookmark.clippingVolume;

                dispatch(
                    renderActions.setClippingPlanes({
                        enabled,
                        mode: mode === "intersection" ? ClippingMode.intersection : ClippingMode.union,
                        planes: planes
                            .map((plane) => {
                                const flipped = flip(plane);
                                flipped[3] *= -1;
                                return flipped;
                            })
                            .map((plane) => ({
                                normalOffset: plane,
                                baseW: plane[3],
                                color: [0, 1, 0, 0.2],
                            })),
                    })
                );
            } else {
                dispatch(renderActions.setClippingPlanes({ planes: [], enabled: false, mode: ClippingMode.union }));
            }

            if (bookmark.ortho?.referenceCoordSys) {
                const m = bookmark.ortho.referenceCoordSys;
                const q = quat.fromMat3(
                    quat.create(),
                    mat3.fromValues(m[0], m[1], m[2], m[4], m[5], m[6], m[8], m[9], m[10])
                );
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Orthographic,
                        goTo: {
                            position: flip([
                                bookmark.ortho.referenceCoordSys[12],
                                bookmark.ortho.referenceCoordSys[13],
                                bookmark.ortho.referenceCoordSys[14],
                            ]),
                            rotation: flipGLtoCadQuat(q),
                            fov: bookmark.ortho.fieldOfView,
                            far: bookmark.ortho.far,
                        },
                        gridOrigo: bookmark.grid?.origo ? flip(bookmark.grid.origo) : undefined,
                    })
                );
            } else if (bookmark.camera) {
                dispatch(
                    renderActions.setCamera({
                        type: CameraType.Pinhole,
                        goTo: {
                            position: flip(bookmark.camera.position),
                            rotation: flipGLtoCadQuat(bookmark.camera.rotation),
                            fov: bookmark.camera.fieldOfView,
                        },
                    })
                );
            }

            dispatch(renderActions.setGrid({ enabled: bookmark.grid?.enabled ?? false }));

            if (bookmark.followPath) {
                const { profile, currentCenter } = bookmark.followPath;

                dispatch(followPathActions.setProfile(String(profile)));
                dispatch(followPathActions.setView2d(Boolean(bookmark.ortho)));
                dispatch(followPathActions.setShowGrid(Boolean(bookmark.grid?.enabled)));
                dispatch(followPathActions.setCurrentCenter(currentCenter ? flip(currentCenter) : currentCenter));

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
                    dispatch(
                        followPathActions.setSelectedPositions(
                            bookmark.followPath.parametric.map((v) => ({ ...v, pos: flip(v.pos) }))
                        )
                    );
                    dispatch(followPathActions.setGoToRouterPath(`/followPos`));
                } else {
                    if ("ids" in bookmark.followPath) {
                        dispatch(followPathActions.setSelectedIds(bookmark.followPath.ids));
                        dispatch(followPathActions.setDrawRoadIds(bookmark.followPath.roadIds));

                        if (bookmark.followPath.roadIds) {
                            dispatch(followPathActions.setSelectedPath(bookmark.followPath.ids[0]));
                        }
                    } else {
                        dispatch(followPathActions.setSelectedIds([bookmark.followPath.id]));
                        dispatch(followPathActions.setGoToRouterPath(`/followIds`));
                    }
                    dispatch(followPathActions.setGoToRouterPath(`/followIds`));
                }
            }

            if (bookmark.subtrees) {
                dispatch(renderActions.setSubtreesFromBookmark(bookmark.subtrees));
            }

            if (bookmark.viewMode) {
                dispatch(renderActions.setViewMode(bookmark.viewMode));
            } else {
                dispatch(renderActions.setViewMode(ViewMode.Default));
            }

            if (bookmark.deviations) {
                const { mode, index } = bookmark.deviations;
                dispatch(
                    renderActions.setPoints({
                        deviation: {
                            index,
                            mixFactor: mode === "off" ? 0 : mode === "on" ? 1 : 0.5,
                        },
                    })
                );
            }

            if (bookmark.background) {
                dispatch(renderActions.setBackground({ color: bookmark.background.color }));
            }
        },
        [
            dispatch,
            dispatchHidden,
            dispatchHighlighted,
            dispatchHighlightCollections,
            dispatchObjectGroups,
            dispatchSelectionBasket,
            objectGroups,
            sceneId,
            measureScene,
        ]
    );

    const select = useCallback(
        (bookmark: Bookmark): Promise<void> => {
            if (!bookmark.explorerState) {
                return selectLegacy(bookmark);
            }

            return selectExplorerState(bookmark.explorerState);
        },
        [selectExplorerState, selectLegacy]
    );

    return select;
}

function getUpdatedGroups(
    current: ObjectGroup[],
    bookmark: NonNullable<Bookmark["explorerState"]>["groups"]
): ObjectGroup[] {
    return current.map((group) => {
        const bookmarked = bookmark.find((bookmarked) => bookmarked.id === group.id);
        let status = GroupStatus.None;

        if (bookmarked) {
            switch (bookmarked.status) {
                case "none":
                    break;
                case "selected":
                    status = GroupStatus.Selected;
                    break;
                case "hidden":
                    status = GroupStatus.Hidden;
                    break;
                case "frozen":
                    status = GroupStatus.Frozen;
                    break;
            }
        }

        return {
            ...group,
            status,
        };
    });
}
