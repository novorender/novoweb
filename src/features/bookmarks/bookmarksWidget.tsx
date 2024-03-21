import { Box } from "@mui/material";
import { useEffect } from "react";
import { MemoryRouter, Route, Switch } from "react-router-dom";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";
import { selectUser } from "slices/authSlice";
import { selectIsOnline, selectMaximized, selectMinimized } from "slices/explorerSlice";

import {
    BookmarkAccess,
    bookmarksActions,
    BookmarksStatus,
    selectBookmarks,
    selectBookmarksStatus,
} from "./bookmarksSlice";
import { BookmarkList } from "./routes/bookmarkList";
import { Crupdate } from "./routes/crupdate";
import { Delete } from "./routes/delete";
import { RenameCollection } from "./routes/renameCollection";

export default function Bookmarks() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.bookmarks.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.bookmarks.key);
    const sceneId = useSceneId();

    const isOnline = useAppSelector(selectIsOnline);
    const user = useAppSelector(selectUser);
    const bookmarks = useAppSelector(selectBookmarks);
    const status = useAppSelector(selectBookmarksStatus);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (status === BookmarksStatus.Initial) {
            initBookmarks();
        }

        async function initBookmarks() {
            dispatch(bookmarksActions.setStatus(BookmarksStatus.Loading));

            try {
                const [publicBmks, personalBmks] = await Promise.all([
                    dataApi.getBookmarks(sceneId),
                    user || !isOnline ? dataApi.getBookmarks(sceneId, { personal: true }) : Promise.resolve([]),
                ]);

                dispatch(
                    bookmarksActions.setBookmarks(
                        [
                            ...publicBmks.map((bm) => ({ ...bm, access: BookmarkAccess.Public })),
                            ...personalBmks.map((bm) => ({ ...bm, access: BookmarkAccess.Personal })),
                        ].map((bm) => (bm.id ? bm : { ...bm, id: window.crypto.randomUUID() }))
                    )
                );
                dispatch(bookmarksActions.setStatus(BookmarksStatus.Running));
            } catch {
                dispatch(bookmarksActions.setStatus(BookmarksStatus.Error));
            }
        }
    }, [bookmarks, dispatch, sceneId, status, user, isOnline]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.bookmarks} disableShadow />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexGrow={1}
                    overflow="hidden"
                    flexDirection="column"
                >
                    <MemoryRouter>
                        <Switch>
                            <Route path="/" exact>
                                <BookmarkList />
                            </Route>
                            <Route path="/create" exact>
                                <Crupdate />
                            </Route>
                            <Route path="/edit/:id" exact>
                                <Crupdate />
                            </Route>
                            <Route path="/delete/:id" exact>
                                <Delete />
                            </Route>
                            <Route path="/renameCollection">
                                <RenameCollection />
                            </Route>
                        </Switch>
                    </MemoryRouter>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.bookmarks.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
