import { MemoryRouter, Route, Switch, useHistory, useRouteMatch } from "react-router-dom";
import { Box, ListItemIcon, ListItemText, Menu, MenuItem, MenuProps } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMinimized, selectMaximized, selectHasAdminCapabilities } from "slices/explorerSlice";
import { useSceneId } from "hooks/useSceneId";

import { Auth } from "./routes/auth";
import { Login } from "./routes/login";
import { Machines } from "./routes/machines";
import { Settings } from "./routes/settings";
import { LogPoints } from "./routes/logPoints";
import { LogPoint } from "./routes/logPoint";
import { Machine } from "./routes/machine";
import { selectXsiteManageAccessToken, xsiteManageActions } from "./slice";
import { AsyncStatus } from "types/misc";
import { StorageKey } from "config/storage";
import { deleteFromStorage } from "utils/storage";
import { Logout, SettingsRounded } from "@mui/icons-material";

export default function XsiteManage() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.xsiteManage.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.xsiteManage.key;
    const sceneId = useSceneId();

    return (
        <MemoryRouter>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    WidgetMenu={WidgetMenu}
                    widget={featuresConfig.xsiteManage}
                    disableShadow={!menuOpen && !minimized}
                />
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
                        <Route path="/login" exact>
                            <Login sceneId={sceneId} />
                        </Route>
                        <Route path="/machines" exact>
                            <Machines />
                        </Route>
                        <Route path="/machine/:id" exact>
                            <Machine />
                        </Route>
                        <Route path="/log-points" exact>
                            <LogPoints />
                        </Route>
                        <Route path="/log-point/:id" exact>
                            <LogPoint />
                        </Route>
                        <Route path="/settings" exact>
                            <Settings sceneId={sceneId} />
                        </Route>
                    </Switch>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.xsiteManage.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </MemoryRouter>
    );
}

function WidgetMenu(props: MenuProps) {
    const settingsPaths = ["/*"];
    const accessToken = useAppSelector(selectXsiteManageAccessToken);
    const isAdmin = useAppSelector(selectHasAdminCapabilities);

    if (accessToken.status !== AsyncStatus.Success) {
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
                    deleteFromStorage(StorageKey.XsiteManageRefreshToken);
                    dispatch(xsiteManageActions.logOut());
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

    if (match.url === "/settings") {
        return null;
    }

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
