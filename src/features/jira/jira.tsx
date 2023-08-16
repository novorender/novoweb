import { Logout, SettingsRounded } from "@mui/icons-material";
import { Box, ListItemIcon, ListItemText, Menu, MenuItem, MenuProps } from "@mui/material";
import { PropsWithChildren, useEffect, useRef } from "react";
import { MemoryRouter, Route, Switch, SwitchProps, useHistory, useLocation } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { StorageKey } from "config/storage";
import WidgetList from "features/widgetList/widgetList";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";
import { selectHasAdminCapabilities, selectMaximized, selectMinimized } from "slices/explorerSlice";
import { deleteFromStorage } from "utils/storage";

import { jiraActions, selectJiraAccessTokenData, selectJiraClickedMarker, selectJiraLastViewedPath } from "./jiraSlice";
import { Auth } from "./routes/auth";
import { CreateIssue } from "./routes/create";
import { CreateComment } from "./routes/createComment";
import { Filters } from "./routes/filters";
import { Issue } from "./routes/issue";
import { Issues } from "./routes/issues";
import { Login } from "./routes/login";
import { Settings } from "./routes/settings";

export default function Jira() {
    const sceneId = useSceneId();
    const [menuOpen, toggleMenu] = useToggle();
    const lastViewedPath = useAppSelector(selectJiraLastViewedPath);
    const minimized = useAppSelector(selectMinimized) === featuresConfig.jira.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.jira.key);

    return (
        <MemoryRouter initialEntries={["/issues", lastViewedPath]} initialIndex={1}>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader WidgetMenu={WidgetMenu} widget={featuresConfig.jira} disableShadow />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexDirection="column"
                    flexGrow={1}
                    overflow="hidden"
                >
                    <CustomSwitch>
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
                    </CustomSwitch>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.jira.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
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

function CustomSwitch(props: PropsWithChildren<SwitchProps>) {
    const history = useHistory();
    const location = useLocation();
    const willUnmount = useRef(false);
    const clickedMarker = useAppSelector(selectJiraClickedMarker);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (clickedMarker) {
            history.push(`/issue/${clickedMarker}`);
            dispatch(jiraActions.setClickedMarker(""));
        }
    }, [dispatch, history, clickedMarker]);

    useEffect(() => {
        return () => {
            willUnmount.current = true;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (willUnmount.current) {
                dispatch(
                    jiraActions.setLastViewedPath(location.pathname.startsWith("/issue") ? location.pathname : "/")
                );
            }
        };
    }, [location, dispatch]);

    return <Switch {...props} />;
}
