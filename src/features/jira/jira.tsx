import { MemoryRouter, Route, Switch, useHistory } from "react-router-dom";
import { Box, ListItemIcon, ListItemText, Menu, MenuItem, MenuProps } from "@mui/material";
import { Logout, SettingsRounded } from "@mui/icons-material";

import { useAppDispatch, useAppSelector } from "app/store";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMinimized, selectMaximized, selectHasAdminCapabilities } from "slices/explorerSlice";
import { useSceneId } from "hooks/useSceneId";
import { deleteFromStorage } from "utils/storage";
import { StorageKey } from "config/storage";

import { Auth } from "./routes/auth";
import { Login } from "./routes/login";
import { Issues } from "./routes/issues";
import { Settings } from "./routes/settings";
import { Filters } from "./routes/filters";
import { Issue } from "./routes/issue";
import { CreateIssue } from "./routes/create";
import { CreateComment } from "./routes/createComment";
import { jiraActions, selectJiraAccessTokenData } from "./jiraSlice";

export default function Jira() {
    const sceneId = useSceneId();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.jira.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.jira.key;

    return (
        <MemoryRouter>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader WidgetMenu={WidgetMenu} widget={featuresConfig.jira} disableShadow />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexDirection="column"
                    flexGrow={1}
                    overflow="hidden"
                >
                    <Switch>
                        <Route path="/" exact>
                            <Auth />
                        </Route>
                        <Route path="/login">
                            <Login sceneId={sceneId} />
                        </Route>
                        <Route path="/issues">
                            <Issues />
                        </Route>
                        <Route path="/settings">
                            <Settings sceneId={sceneId} />
                        </Route>
                        <Route path="/filters">
                            <Filters />
                        </Route>
                        <Route path="/issue/:key">
                            <Issue sceneId={sceneId} />
                        </Route>
                        <Route path="/create">
                            <CreateIssue sceneId={sceneId} />
                        </Route>
                        <Route path="/createComment/:key">
                            <CreateComment />
                        </Route>
                    </Switch>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.jira.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} testId={`${featuresConfig.jira.key}-widget-menu-fab`} />
        </MemoryRouter>
    );
}

function WidgetMenu(props: MenuProps) {
    const settingsPaths = ["/*"];
    const accessToken = useAppSelector(selectJiraAccessTokenData);
    const isAdmin = useAppSelector(selectHasAdminCapabilities);

    if (!accessToken) {
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
                    deleteFromStorage(StorageKey.JiraRefreshToken);
                    dispatch(jiraActions.logOut());
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

    return (
        <div>
            <MenuItem
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
