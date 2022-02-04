import { Bookmark } from "@novorender/data-js-api";

import { useAppDispatch } from "app/store";
import { customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { hiddenGroupActions, useDispatchHidden } from "contexts/hidden";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { useDispatchVisible, visibleActions } from "contexts/visible";
import { CameraType, ObjectVisibility, renderActions, SelectionBasketMode } from "slices/renderSlice";

export function useSelectBookmark() {
    const dispatchVisible = useDispatchVisible();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const { state: customGroups, dispatch: dispatchCustom } = useCustomGroups();
    const {
        state: { view },
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

        dispatchCustom(customGroupsActions.set(updatedCustomGroups));

        const main = bmDefaultGroup && bmDefaultGroup.ids?.length ? bmDefaultGroup.ids.slice(-1)[0] : undefined;
        dispatch(renderActions.setMainObject(main));

        if (bookmark.selectedOnly !== undefined) {
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

        if (bookmark.measurement) {
            dispatch(renderActions.setMeasurePoints(bookmark.measurement));
        } else {
            dispatch(renderActions.setMeasurePoints([]));
        }

        if (bookmark.clippingPlanes) {
            view?.applySettings({ clippingPlanes: { ...bookmark.clippingPlanes, highlight: -1 } });
            dispatch(renderActions.setClippingBox({ ...bookmark.clippingPlanes, highlight: -1, defining: false }));
        } else {
            dispatch(renderActions.resetClippingBox());
        }

        if (bookmark.clippingVolume) {
            const { enabled, mode, planes } = bookmark.clippingVolume;
            dispatch(renderActions.setClippingPlanes({ enabled, mode, planes: Array.from(planes), defining: false }));
        } else {
            dispatch(renderActions.setClippingPlanes({ defining: false, planes: [], enabled: false, mode: "union" }));
        }

        if (bookmark.ortho) {
            dispatch(renderActions.setCamera({ type: CameraType.Orthographic, params: bookmark.ortho }));
        } else if (bookmark.camera) {
            dispatch(renderActions.setCamera({ type: CameraType.Flight, goTo: bookmark.camera }));
            dispatch(renderActions.setSelectingOrthoPoint(false));
        }
    };

    return select;
}
