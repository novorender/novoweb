import { useEffect } from "react";

import { useLazyGetBookmarksQuery } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useSceneId } from "hooks/useSceneId";
import { selectUser } from "slices/authSlice";
import { selectIsOnline } from "slices/explorer";
import { AsyncStatus } from "types/misc";

import { BookmarkAccess, bookmarksActions, selectBookmarks, selectBookmarksStatus } from "./bookmarksSlice";

export function useInitBookmarks({ skip }: { skip?: boolean } = {}) {
    const sceneId = useSceneId();
    const isOnline = useAppSelector(selectIsOnline);
    const user = useAppSelector(selectUser);
    const bookmarks = useAppSelector(selectBookmarks);
    const status = useAppSelector(selectBookmarksStatus);
    const dispatch = useAppDispatch();

    const [getBookmarks] = useLazyGetBookmarksQuery();

    useEffect(() => {
        if (status === AsyncStatus.Initial && !skip) {
            initBookmarks();
        }

        async function initBookmarks() {
            dispatch(bookmarksActions.setInitStatus(AsyncStatus.Loading));

            try {
                const [publicBmks, personalBmks] = await Promise.all([
                    getBookmarks({ projectId: sceneId }, true).unwrap(),
                    user || !isOnline
                        ? getBookmarks({ projectId: sceneId, personal: true }, true).unwrap()
                        : Promise.resolve([]),
                ]);

                dispatch(bookmarksActions.setInitStatus(AsyncStatus.Success));
                dispatch(
                    bookmarksActions.setBookmarks(
                        [
                            ...publicBmks.map((bm) => ({ ...bm, access: BookmarkAccess.Public })),
                            ...personalBmks.map((bm) => ({ ...bm, access: BookmarkAccess.Personal })),
                        ].map((bm) => (bm.id ? bm : { ...bm, id: window.crypto.randomUUID() })),
                    ),
                );
            } catch (e) {
                console.warn(e);
                dispatch(bookmarksActions.setInitStatus(AsyncStatus.Error));
            }
        }
    }, [bookmarks, dispatch, sceneId, user, isOnline, status, skip, getBookmarks]);
}
