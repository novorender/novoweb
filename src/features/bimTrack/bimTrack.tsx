import { Logout, SettingsRounded } from "@mui/icons-material";
import { Box, ListItemIcon, ListItemText, Menu, MenuItem, MenuProps } from "@mui/material";
import { MemoryRouter, Route, Switch, useHistory, useRouteMatch } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { StorageKey } from "config/storage";
import WidgetList from "features/widgetList/widgetList";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";
import { selectHasAdminCapabilities, selectMaximized, selectMinimized } from "slices/explorer";
import { AsyncStatus } from "types/misc";
import { deleteFromStorage } from "utils/storage";

import { resetBimTrackApiState } from "./bimTrackApi";
import { bimTrackActions, selectAccessToken } from "./bimTrackSlice";
import { Auth } from "./routes/auth";
import { CreateComment } from "./routes/createComment";
import { CreateTopic } from "./routes/createTopic";
import { EditTopic } from "./routes/editTopic";
import { Filters } from "./routes/filters";
import { Login } from "./routes/login";
import { Settings } from "./routes/settings";
import { Topic } from "./routes/topic";
import { Topics } from "./routes/topics";

export default function BimTrack() {
    const sceneId = useSceneId();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.bimTrack.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.bimTrack.key);

    return (
        <>
            <MemoryRouter>
                <WidgetContainer minimized={minimized} maximized={maximized}>
                    <WidgetHeader WidgetMenu={WidgetMenu} widget={featuresConfig.bimTrack} disableShadow />
                    <Box
                        display={menuOpen || minimized ? "none" : "flex"}
                        flexGrow={1}
                        overflow="hidden"
                        flexDirection="column"
                    >
                        <Switch>
                            <Route path="/" exact>
                                <Auth />
                            </Route>
                            <Route path="/login" exact>
                                <Login sceneId={sceneId} />
                            </Route>
                            <Route path="/settings" exact>
                                <Settings sceneId={sceneId} />
                            </Route>
                            <Route path="/:projectId/topics" exact>
                                {<Topics />}
                            </Route>
                            <Route path="/project/:projectId/topic/:topicId" exact>
                                <Topic />
                            </Route>
                            <Route path="/project/:projectId/filter" exact>
                                <Filters />
                            </Route>
                            <Route path="/project/:projectId/new-topic" exact>
                                <CreateTopic />
                            </Route>
                            <Route path="/project/:projectId/topic/:topicId/new-comment" exact>
                                <CreateComment />
                            </Route>
                            <Route path="/project/:projectId/topic/:topicId/edit" exact>
                                <EditTopic />
                            </Route>
                        </Switch>
                    </Box>
                    {menuOpen && <WidgetList widgetKey={featuresConfig.bimTrack.key} onSelect={toggleMenu} />}
                </WidgetContainer>
                <LogoSpeedDial open={menuOpen} toggle={toggleMenu} ariaLabel="toggle widget menu" />
            </MemoryRouter>
        </>
    );
}

function WidgetMenu(props: MenuProps) {
    const settingsPaths = ["/*"];
    const token = useAppSelector(selectAccessToken);
    const isAdmin = useAppSelector(selectHasAdminCapabilities);

    if (token.status !== AsyncStatus.Success) {
        return null;
    }

    return (
        <>
            <Menu {...props}>
                <LogoutMenuItem onClose={props.onClose} />
                {isAdmin && (
                    <Route path={settingsPaths} exact>
                        <SettingsMenuItem onClose={props.onClose} />
                    </Route>
                )}
            </Menu>
        </>
    );
}

function LogoutMenuItem({ onClose }: { onClose: MenuProps["onClose"] }) {
    const history = useHistory();
    const dispatch = useAppDispatch();

    return (
        <div>
            <MenuItem
                onClick={() => {
                    deleteFromStorage(StorageKey.BimTrackRefreshToken);
                    resetBimTrackApiState();
                    dispatch(bimTrackActions.logOut());
                    history.push("/login");

                    if (onClose) {
                        onClose({}, "backdropClick");
                    }
                }}
            >
                <>
                    <ListItemIcon>
                        <Logout />
                    </ListItemIcon>
                    <ListItemText>Log out</ListItemText>
                </>
            </MenuItem>
        </div>
    );
}

function SettingsMenuItem({ onClose }: { onClose: MenuProps["onClose"] }) {
    const history = useHistory();
    const match = useRouteMatch();

    return (
        <div>
            <MenuItem
                disabled={match.url === "/settings"}
                onClick={() => {
                    history.push("/settings");

                    if (onClose) {
                        onClose({}, "backdropClick");
                    }
                }}
            >
                <>
                    <ListItemIcon>
                        <SettingsRounded />
                    </ListItemIcon>
                    <ListItemText>Settings</ListItemText>
                </>
            </MenuItem>
        </div>
    );
}
