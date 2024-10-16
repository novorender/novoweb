import { useMemo } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { selectBookmarks } from "features/bookmarks";
import { useInitBookmarks } from "features/bookmarks/useInitBookmarks";

import { Category } from "../types";

export function useBookmarkOptions(skip: boolean) {
    useInitBookmarks({ skip });
    const bookmarks = useAppSelector(selectBookmarks);

    return useMemo(() => {
        if (skip) {
            return [];
        }

        return bookmarks.map((bm) => ({
            id: bm.id,
            label: bm.name,
            bookmark: bm,
            category: Category.Bookmark as const,
        }));
    }, [bookmarks, skip]);
}
