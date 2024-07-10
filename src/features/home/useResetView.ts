import { useAppDispatch } from "app/redux-store-interactions";
import { hiddenActions, useDispatchHidden } from "contexts/hidden";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { GroupStatus, objectGroupsActions, useDispatchObjectGroups, useLazyObjectGroups } from "contexts/objectGroups";
import { selectionBasketActions, useDispatchSelectionBasket } from "contexts/selectionBasket";
import { renderActions } from "features/render";
import { loadScene } from "features/render/utils";
import { useSceneId } from "hooks/useSceneId";

import { useDefaultCamera } from "../render/hooks/useDefaultCamera";

export function useResetView() {
    const sceneId = useSceneId();
    const defaultCamera = useDefaultCamera();
    const dispatch = useAppDispatch();
    const dispatchHighlightCollections = useDispatchHighlightCollections();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const dispatchSelectionBasket = useDispatchSelectionBasket();
    const objectGroups = useLazyObjectGroups();
    const dispatchObjectGroups = useDispatchObjectGroups();

    const clearObjectHighlights = () => {
        dispatchHidden(hiddenActions.setIds([]));
        dispatchHighlighted(highlightActions.setIds([]));
        dispatchSelectionBasket(selectionBasketActions.set([]));
        dispatchHighlightCollections(highlightCollectionsActions.clearAll());
    };

    const reset = async ({ resetCamera = true }: { resetCamera?: boolean } | undefined = {}) => {
        try {
            const [{ url: _url, db: _db, ...sceneData }, camera] = await loadScene(sceneId);
            const groups = sceneData.objectGroups ?? [];
            const initialCamera = resetCamera ? camera ?? defaultCamera : undefined;

            dispatch(
                renderActions.resetView({
                    sceneData,
                    initialCamera,
                })
            );
            clearObjectHighlights();
            dispatchObjectGroups(
                objectGroupsActions.set(
                    [
                        ...objectGroups.current.map((group) => {
                            const saved = groups.find((grp) => group.id === grp.id);

                            if (saved) {
                                group.status = saved.selected
                                    ? GroupStatus.Selected
                                    : saved.hidden
                                    ? GroupStatus.Hidden
                                    : saved.frozen
                                    ? GroupStatus.Frozen
                                    : GroupStatus.None;
                            }

                            return group;
                        }),
                    ].sort(
                        (a, b) =>
                            groups.findIndex((grp) => grp.id === a.id) - groups.findIndex((grp) => grp.id === b.id)
                    )
                )
            );
        } catch (e) {
            console.warn(e);
        }
    };

    return reset;
}
