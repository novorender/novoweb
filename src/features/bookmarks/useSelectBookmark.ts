import { vec4 } from "gl-matrix";
import { Bookmark } from "@novorender/data-js-api";

import { useAppDispatch } from "app/store";
import { customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { hiddenGroupActions, useDispatchHidden } from "contexts/hidden";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useDispatchVisible, visibleActions } from "contexts/visible";
import { followPathActions, getNurbs } from "features/followPath";
import { measureActions } from "features/measure";
import { CameraType, DeepWritable, ObjectVisibility, renderActions, SelectionBasketMode } from "slices/renderSlice";
import { AsyncStatus } from "types/misc";

export function useSelectBookmark() {
    const dispatchVisible = useDispatchVisible();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const { state: customGroups, dispatch: dispatchCustom } = useCustomGroups();
    const {
        state: { view, scene },
    } = useExplorerGlobals();

    const dispatch = useAppDispatch();

    const select = (bookmark: Bookmark) => {
        const bmDefaultGroup = bookmark.objectGroups?.find((group) => !group.id && group.selected);
        dispatchHighlighted(highlightActions.setIds((bmDefaultGroup?.ids as number[] | undefined) ?? []));

        const bmHiddenGroup = bookmark.objectGroups?.find((group) => !group.id && group.hidden);
        dispatchHidden(hiddenGroupActions.setIds((bmHiddenGroup?.ids as number[] | undefined) ?? []));

        const updatedCustomGroups = customGroups.map((group) => {
            const bookmarked = bookmark.objectGroups?.find((bmGroup) => bmGroup.id === group.id);

            return {
                ...group,
                selected: bookmarked ? bookmarked.selected : false,
                hidden: bookmarked ? bookmarked.hidden : false,
            };
        });

        if (bookmark.objectGroups) {
            const groups = bookmark.objectGroups;
            updatedCustomGroups.sort(
                (a, b) => groups.findIndex((grp) => grp.id === a.id) - groups.findIndex((grp) => grp.id === b.id)
            );
        }

        dispatchCustom(customGroupsActions.set(updatedCustomGroups));

        const main = bmDefaultGroup && bmDefaultGroup.ids?.length ? bmDefaultGroup.ids.slice(-1)[0] : undefined;
        dispatch(renderActions.setMainObject(main));

        if (bookmark.defaultVisibility !== undefined) {
            dispatch(renderActions.setDefaultVisibility(bookmark.defaultVisibility as ObjectVisibility));
        } else if (bookmark.selectedOnly !== undefined) {
            dispatch(
                renderActions.setDefaultVisibility(
                    bookmark.selectedOnly ? ObjectVisibility.SemiTransparent : ObjectVisibility.Neutral
                )
            );
        }

        if (bookmark.selectionBasket) {
            dispatchVisible(visibleActions.set(bookmark.selectionBasket.ids));
            dispatch(renderActions.setSelectionBasketMode(bookmark.selectionBasket.mode));
        } else {
            dispatchVisible(visibleActions.set([]));
            dispatch(renderActions.setSelectionBasketMode(SelectionBasketMode.Loose));
        }

        if (bookmark.objectMeasurement) {
            dispatch(measureActions.setSelected(bookmark.objectMeasurement));
        } else if (bookmark.measurement) {
            dispatch(
                measureActions.setSelected(bookmark.measurement.slice(0, 2).map((pt, idx) => ({ pos: pt, id: -idx })))
            );
        } else {
            dispatch(measureActions.setSelected([]));
        }

        if (bookmark.clippingPlanes) {
            view?.applySettings({ clippingPlanes: { ...bookmark.clippingPlanes, highlight: -1 } });
            dispatch(renderActions.setClippingBox({ ...bookmark.clippingPlanes, highlight: -1, defining: false }));
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

            const { profile, id, currentCenter } = bookmark.followPath;

            getNurbs({ scene, objectId: id })
                .then((nurbs) => {
                    dispatch(followPathActions.setProfile(String(profile)));
                    dispatch(followPathActions.setProfileRange({ min: nurbs.knots[0], max: nurbs.knots.slice(-1)[0] }));
                    dispatch(followPathActions.setView2d(Boolean(bookmark.ortho)));
                    dispatch(followPathActions.setShowGrid(Boolean(bookmark.grid?.enabled)));
                    dispatch(followPathActions.setCurrentCenter(currentCenter as [number, number, number]));

                    if (bookmark.ortho?.far) {
                        dispatch(followPathActions.setClipping(bookmark.ortho.far));
                    }

                    if (bookmark.ortho) {
                        dispatch(
                            followPathActions.setPtHeight(
                                bookmark.ortho.referenceCoordSys ? bookmark.ortho.referenceCoordSys[13] : undefined
                            )
                        );
                    } else {
                        dispatch(
                            followPathActions.setPtHeight(bookmark.camera ? bookmark.camera.position[1] : undefined)
                        );
                    }

                    dispatch(followPathActions.setGoToRouterPath(`/landXml/${id}`));

                    dispatch(
                        followPathActions.setCurrentPath({
                            status: AsyncStatus.Success,
                            data: {
                                id,
                                nurbs,
                            },
                        })
                    );
                })
                .catch((e) => console.warn(e));
        }
    };

    return select;
}
