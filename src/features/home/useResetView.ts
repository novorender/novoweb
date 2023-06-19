import { quat, vec3 } from "gl-matrix";

import { useAppDispatch, useAppSelector } from "app/store";
import { hiddenActions, useDispatchHidden } from "contexts/hidden";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { selectionBasketActions, useDispatchSelectionBasket } from "contexts/selectionBasket";
import { renderActions, selectHomeCameraPosition } from "features/render";
import { loadScene } from "features/render/hooks/useHandleInit";
import { useSceneId } from "hooks/useSceneId";
import { GroupStatus, objectGroupsActions, useDispatchObjectGroups, useLazyObjectGroups } from "contexts/objectGroups";

export function useResetView() {
    const sceneId = useSceneId();
    const homePos = useAppSelector(selectHomeCameraPosition);
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
            const { url: _url, db: _db, ...sceneData } = await loadScene(sceneId);
            const groups = sceneData.objectGroups ?? [];
            const initialCamera = resetCamera
                ? sceneData.camera
                    ? {
                          position: vec3.clone(sceneData.camera.position),
                          rotation: quat.clone(sceneData.camera.rotation),
                      }
                    : { position: vec3.clone(homePos.position), rotation: quat.clone(homePos.rotation) }
                : undefined;

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
                                    : GroupStatus.Default;
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
            console.warn("Failed to load scene.");
        }
    };

    return reset;
}
