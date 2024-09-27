import { useEffect } from "react";

import { useLazyGetBookmarksQuery } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
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
    const [getBookmarks] = useLazyGetBookmarksQuery();

    useEffect(() => {
        handleUrlBookmark();

        async function handleUrlBookmark() {
            if (!view || !urlBookmarkId) {
                return;
            }

            dispatch(explorerActions.setUrlBookmarkId(undefined));

            try {
                const shareLinkBookmark = (
                    await getBookmarks({ projectId: sceneId, group: urlBookmarkId }, true).unwrap()
                ).find((bm) => bm.id === urlBookmarkId);

                if (shareLinkBookmark) {
                    selectBookmark(shareLinkBookmark);
                    return;
                }

                const savedPublicBookmark = (await getBookmarks({ projectId: sceneId }, true).unwrap()).find(
                    (bm) => bm.id === urlBookmarkId
                );
                if (savedPublicBookmark) {
                    selectBookmark(savedPublicBookmark);
                    return;
                }
            } catch (e) {
                console.warn(e);
            }
        }
    }, [view, sceneId, dispatch, selectBookmark, urlBookmarkId, getBookmarks]);

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
