import { SettingsRounded } from "@mui/icons-material";
import { Box, ListItemIcon, ListItemText, Menu, MenuItem, MenuProps } from "@mui/material";
import { PropsWithChildren, useEffect, useRef } from "react";
import {
    MemoryRouter,
    Redirect,
    Route,
    Switch,
    SwitchProps,
    useHistory,
    useLocation,
    useRouteMatch,
} from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";
import { selectHasAdminCapabilities, selectMaximized, selectMinimized } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";

import { Feed } from "./routes/feed/feed";
import { Filters } from "./routes/feed/filters";
import { Post } from "./routes/feed/post";
import { Protected } from "./routes/protected";
import { Settings } from "./routes/settings";
import { ditioActions, selectClickedMarker, selectDitioAccessToken, selectLastViewedPath } from "./slice";

export default function Ditio() {
    const sceneId = useSceneId();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.ditio.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.ditio.key);
    const lastViewedPath = useAppSelector(selectLastViewedPath);

    return (
        <MemoryRouter initialEntries={["/", lastViewedPath]} initialIndex={1}>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader WidgetMenu={WidgetMenu} widget={featuresConfig.ditio} disableShadow />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexGrow={1}
                    overflow="hidden"
                    flexDirection="column"
                >
                    <Protected sceneId={sceneId}>
                        <CustomSwitch>
                            <Route path="/" exact>
                                <Redirect to="/feed" />
                            </Route>
                            <Route path="/feed" exact>
                                <Feed />
                            </Route>
                            <Route path="/feed/post/:id">
                                <Post />
                            </Route>
                            <Route path="/feed/filters">
                                <Filters />
                            </Route>
                            <Route path="/settings">
                                <Settings sceneId={sceneId} />
                            </Route>
                        </CustomSwitch>
                    </Protected>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.ditio.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </MemoryRouter>
    );
}

function CustomSwitch(props: PropsWithChildren<SwitchProps>) {
    const history = useHistory();
    const location = useLocation();
    const willUnmount = useRef(false);
    const clickedMarker = useAppSelector(selectClickedMarker);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (clickedMarker) {
            history.push(`/feed/post/${clickedMarker}`);
            dispatch(ditioActions.setClickedMarker(""));
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
                dispatch(ditioActions.setLastViewedPath(location.pathname));
            }
        };
    }, [location, dispatch]);

    return <Switch {...props} />;
}

function WidgetMenu(props: MenuProps) {
    const settingsPaths = ["/*"];
    const token = useAppSelector(selectDitioAccessToken);
    const isAdmin = useAppSelector(selectHasAdminCapabilities);

    if (token.status !== AsyncStatus.Success || !isAdmin) {
        return null;
    }

    return (
        <>
            <Menu {...props}>
                {isAdmin && (
                    <Route path={settingsPaths} exact>
                        <SettingsMenuItem onClose={props.onClose} />
                    </Route>
                )}
            </Menu>
        </>
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
