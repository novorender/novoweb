import { ObjectId } from "@novorender/api";
import { HierarcicalObjectReference } from "@novorender/webgl-api";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { highlightActions, useDispatchHighlighted, useLazyHighlighted } from "contexts/highlighted";
import { selectionBasketActions, useDispatchSelectionBasket } from "contexts/selectionBasket";
import { CameraType, ObjectVisibility, renderActions } from "features/render";
import { isGlSpace } from "features/render/utils";
import { useAbortController } from "hooks/useAbortController";
import { explorerActions, selectUrlSearchQuery } from "slices/explorerSlice";
import { getTotalBoundingSphere } from "utils/objectData";
import { batchedPropertySearch, searchDeepByPatterns } from "utils/search";
import { sleep } from "utils/time";

export async function useHandleUrlSearch() {
    const {
        state: { db, scene },
    } = useExplorerGlobals();
    const highlighted = useLazyHighlighted();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchSelectionBasket = useDispatchSelectionBasket();
    const dispatch = useAppDispatch();
    const query = useAppSelector(selectUrlSearchQuery);
    const [abortController] = useAbortController();

    useEffect(() => {
        search();

        async function search() {
            if (!query || !db || !scene) {
                return;
            }
            const abortSignal = abortController.current.signal;
            const searchPatterns = query;
            const loadingHandle = performance.now();
            dispatch(renderActions.addLoadingHandle(loadingHandle));
            dispatch(explorerActions.setUrlSearchQuery(undefined));

            let foundIds = [] as ObjectId[];
            let foundRefs = [] as HierarcicalObjectReference[];
            await sleep(5000);
            try {
                await searchDeepByPatterns({
                    db,
                    searchPatterns,
                    abortSignal,
                    callback: (ids) => {
                        foundIds = foundIds.concat(ids);
                        dispatchHighlighted(highlightActions.add(ids));
                    },
                });

                if (foundIds.length) {
                    foundRefs = await batchedPropertySearch({
                        property: "id",
                        value: foundIds.map((id) => String(id)),
                        db,
                        abortSignal,
                    });
                }
            } catch (e) {
                console.warn(e);
            }

            if (foundRefs.length) {
                const boundingSphere = getTotalBoundingSphere(foundRefs, {
                    flip: isGlSpace(scene.up),
                });
                if (boundingSphere) {
                    dispatch(renderActions.setCamera({ type: CameraType.Pinhole, zoomTo: boundingSphere }));
                }
            }

            const selectionOnly = new URLSearchParams(window.location.search).get("selectionOnly");

            if (selectionOnly === "1") {
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));
            } else if (selectionOnly === "2") {
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));
            } else if (selectionOnly === "3") {
                dispatchSelectionBasket(selectionBasketActions.add(highlighted.current.idArr));
                dispatchHighlighted(highlightActions.setIds([]));
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));
            } else {
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
            }

            dispatch(renderActions.setMainObject(foundIds[0]));
            dispatch(renderActions.removeLoadingHandle(loadingHandle));
        }
    }, [query, dispatch, abortController, db, dispatchHighlighted, scene, dispatchSelectionBasket, highlighted]);
}
