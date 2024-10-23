import { Box } from "@mui/material";
import { MemoryRouter, Route, Switch } from "react-router-dom";

import { useAppSelector } from "app/redux-store-interactions";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";

import { BookmarksSnackbar } from "./bookmarksSnackbar";
import { BookmarkList } from "./routes/bookmarkList";
import { Crupdate } from "./routes/crupdate";
import { Delete } from "./routes/delete";
import { RenameCollection } from "./routes/renameCollection";
import { useInitBookmarks } from "./useInitBookmarks";

export default function Bookmarks() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.bookmarks.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.bookmarks.key);

    useInitBookmarks();

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    menuOpen={menuOpen}
                    toggleMenu={toggleMenu}
                    widget={featuresConfig.bookmarks}
                    disableShadow
                />
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
                <BookmarksSnackbar />
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
