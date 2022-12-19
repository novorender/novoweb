import { useEffect } from "react";
import { MemoryRouter, Route, Switch } from "react-router-dom";
import { Box } from "@mui/material";
import { v4 as uuidv4 } from "uuid";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectUser } from "slices/authSlice";
import { selectMaximized, selectMinimized } from "slices/explorerSlice";

import { featuresConfig } from "config/features";
import { WidgetContainer, LogoSpeedDial, WidgetHeader } from "components";
import { WidgetList } from "features/widgetList";

import { useToggle } from "hooks/useToggle";
import { useSceneId } from "hooks/useSceneId";

import {
    selectBookmarksStatus,
    selectBookmarks,
    bookmarksActions,
    BookmarksStatus,
    BookmarkAccess,
} from "./bookmarksSlice";
import { BookmarkList } from "./routes/bookmarkList";
import { Delete } from "./routes/delete";
import { Crupdate } from "./routes/crupdate";

export default function Bookmarks() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.bookmarks.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.bookmarks.key;
    const sceneId = useSceneId();

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
                    user ? dataApi.getBookmarks(sceneId, { personal: true }) : Promise.resolve([]),
                ]);

                dispatch(
                    bookmarksActions.setBookmarks(
                        [
                            ...publicBmks.map((bm) => ({ ...bm, access: BookmarkAccess.Public })),
                            ...personalBmks.map((bm) => ({ ...bm, access: BookmarkAccess.Personal })),
                        ].map((bm) => (bm.id ? bm : { ...bm, id: uuidv4() }))
                    )
                );
                dispatch(bookmarksActions.setStatus(BookmarksStatus.Running));
            } catch {
                dispatch(bookmarksActions.setStatus(BookmarksStatus.Error));
            }
        }
    }, [bookmarks, dispatch, sceneId, status, user]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.bookmarks} disableShadow={!menuOpen} />
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
                        </Switch>
                    </MemoryRouter>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.bookmarks.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.bookmarks.key}-widget-menu-fab`}
            />
        </>
    );
}
