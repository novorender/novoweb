import { useEffect } from "react";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useSelectBookmark } from "features/bookmarks/useSelectBookmark";
import { useSceneId } from "hooks/useSceneId";
import { explorerActions, selectLocalBookmarkId, selectUrlBookmarkId } from "slices/explorer";

export function useHandleInitialBookmark() {
    const sceneId = useSceneId();
    const {
        state: { view },
    } = useExplorerGlobals();

    const urlBookmarkId = useAppSelector(selectUrlBookmarkId);
    const localBookmarkId = useAppSelector(selectLocalBookmarkId);
    const selectBookmark = useSelectBookmark();
    const dispatch = useAppDispatch();

    useEffect(() => {
        handleUrlBookmark();

        async function handleUrlBookmark() {
            if (!view || !urlBookmarkId) {
                return;
            }

            dispatch(explorerActions.setUrlBookmarkId(undefined));

            try {
                const shareLinkBookmark = (await dataApi.getBookmarks(sceneId, { group: urlBookmarkId })).find(
                    (bm) => bm.id === urlBookmarkId
                );

                if (shareLinkBookmark) {
                    selectBookmark(shareLinkBookmark);
                    return;
                }

                const savedPublicBookmark = (await dataApi.getBookmarks(sceneId)).find((bm) => bm.id === urlBookmarkId);
                if (savedPublicBookmark) {
                    selectBookmark(savedPublicBookmark);
                    return;
                }
            } catch (e) {
                console.warn(e);
            }
        }
    }, [view, sceneId, dispatch, selectBookmark, urlBookmarkId]);

    useEffect(() => {
        handleLocalBookmark();

        function handleLocalBookmark() {
            if (!view || !localBookmarkId) {
                return;
            }

            dispatch(explorerActions.setLocalBookmarkId(undefined));

            try {
                const storedBm = sessionStorage.getItem(localBookmarkId);

                if (!storedBm) {
                    return;
                }

                sessionStorage.removeItem(localBookmarkId);
                const bookmark = JSON.parse(storedBm);

                if (!bookmark) {
                    return;
                }
                selectBookmark(bookmark);
            } catch (e) {
                console.warn(e);
            }
        }
    }, [view, sceneId, dispatch, selectBookmark, localBookmarkId]);
}
