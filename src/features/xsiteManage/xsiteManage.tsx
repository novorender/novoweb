import { Logout, SettingsRounded } from "@mui/icons-material";
import { Box, ListItemIcon, ListItemText, Menu, MenuItem, MenuProps } from "@mui/material";
import { PropsWithChildren, useEffect, useRef } from "react";
import { MemoryRouter, Route, Switch, SwitchProps, useHistory, useLocation, useRouteMatch } from "react-router-dom";

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

import { Auth } from "./routes/auth";
import { Login } from "./routes/login";
import { LogPoint } from "./routes/logPoint";
import { LogPoints } from "./routes/logPoints";
import { Machine } from "./routes/machine";
import { Machines } from "./routes/machines";
import { Settings } from "./routes/settings";
import {
    selectXsiteManageAccessToken,
    selectXsiteManageClickedMachineMarker,
    selectXsiteManageLastViewedPath,
    xsiteManageActions,
} from "./slice";

export default function XsiteManage() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.xsiteManage.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.xsiteManage.key);
    const lastViewedPath = useAppSelector(selectXsiteManageLastViewedPath);
    const sceneId = useSceneId();

    return (
        <MemoryRouter initialEntries={["/machines", lastViewedPath]} initialIndex={1}>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader WidgetMenu={WidgetMenu} widget={featuresConfig.xsiteManage} disableShadow />
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
                        <Route path="/login" exact>
                            <Login sceneId={sceneId} />
                        </Route>
                        <Route path="/machines" exact>
                            <Machines />
                        </Route>
                        <Route path="/machines/:id" exact>
                            <Machine />
                        </Route>
                        <Route path="/log-points" exact>
                            <LogPoints />
                        </Route>
                        <Route path="/log-points/:id" exact>
                            <LogPoint />
                        </Route>
                        <Route path="/settings" exact>
                            <Settings sceneId={sceneId} />
                        </Route>
                    </CustomSwitch>
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

function CustomSwitch(props: PropsWithChildren<SwitchProps>) {
    const history = useHistory();
    const location = useLocation();
    const willUnmount = useRef(false);
    const clickedMarker = useAppSelector(selectXsiteManageClickedMachineMarker);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (clickedMarker) {
            history.push(`/machines/${clickedMarker}`);
            dispatch(xsiteManageActions.setClickedMarker(""));
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
                dispatch(xsiteManageActions.setLastViewedPath(location.pathname));
            }
        };
    }, [location, dispatch]);

    return <Switch {...props} />;
}
