import { useCallback } from "react";

import { useSaveBookmarksMutation } from "apis/dataV2/dataV2Api";
import { useCreateBookmark } from "features/bookmarks";
import { useSceneId } from "hooks/useSceneId";

export function useShareLink() {
    const createBookmark = useCreateBookmark();
    const [saveBookmarks] = useSaveBookmarksMutation();
    const sceneId = useSceneId();

    return useCallback(async () => {
        const id = window.crypto.randomUUID();
        const bm = createBookmark();

        const blob = new Blob([`${window.location.origin}${window.location.pathname}?bookmarkId=${id}`], {
            type: "text/plain",
        });
        let saved = false;

        try {
            // Safari treats user activation differently:
            // https://bugs.webkit.org/show_bug.cgi?id=222262.
            await navigator.clipboard.write([
                new ClipboardItem({
                    "text/plain": (async () => {
                        await saveBookmarks({
                            projectId: sceneId,
                            bookmarks: [{ ...bm, id, name: id }],
                            group: id,
                        }).unwrap();

                        saved = true;
                        return blob;
                    })(),
                }),
            ]);
        } catch (e) {
            if (!saved) {
                console.warn(e);
                return;
            }

            navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob,
                }),
            ]);
        }

        return saved;
    }, [createBookmark, saveBookmarks, sceneId]);
}
