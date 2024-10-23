import { useHistory, useParams } from "react-router-dom";

import { useSaveBookmarksMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation } from "components";
import { useSceneId } from "hooks/useSceneId";

import { BookmarkAccess, bookmarksActions, selectBookmarks } from "../bookmarksSlice";

export function Delete() {
    const { id } = useParams<{ id: string }>();
    const history = useHistory();
    const sceneId = useSceneId();

    const bookmarks = useAppSelector(selectBookmarks);
    const dispatch = useAppDispatch();
    const [saveBookmarks] = useSaveBookmarksMutation();

    const handleDelete = () => {
        const bookmarkToDelete = bookmarks.find((bm) => bm.id === id);

        if (!bookmarkToDelete) {
            history.goBack();
            return;
        }

        const personal = bookmarkToDelete.access === BookmarkAccess.Personal;
        const newBookmarks = bookmarks.filter((bm) => bm !== bookmarkToDelete);

        dispatch(bookmarksActions.setBookmarks(newBookmarks));
        saveBookmarks({
            projectId: sceneId,
            bookmarks: newBookmarks
                .filter((bm) =>
                    personal ? bm.access === BookmarkAccess.Personal : bm.access === BookmarkAccess.Public
                )
                .map(({ access: _access, ...bm }) => bm),
            personal,
        }).unwrap();
        history.goBack();
    };

    return (
        <Confirmation
            title="Delete bookmark?"
            confirmBtnText="Delete"
            onCancel={() => history.goBack()}
            onConfirm={handleDelete}
        />
    );
}
