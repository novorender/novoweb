import { PropsWithChildren, useEffect, useRef } from "react";
import { MemoryRouter, Route, Switch, SwitchProps, useHistory, useLocation } from "react-router-dom";
import { Box } from "@mui/material";

import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useAppDispatch, useAppSelector } from "app/store";
import { useToggle } from "hooks/useToggle";
import { useSceneId } from "hooks/useSceneId";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

import { ditioActions, selectClickedMarker, selectLastViewedPath } from "./slice";
import { Feed } from "./routes/feed";
import { Post } from "./routes/post";
import { Filters } from "./routes/filters";
import { Auth } from "./routes/auth";
import { Login } from "./routes/login";
import { Settings } from "./routes/settings";

export default function Ditio() {
    const sceneId = useSceneId();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.ditio.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.ditio.key;
    const lastViewedPath = useAppSelector(selectLastViewedPath);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.ditio} disableShadow />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexGrow={1}
                    overflow="hidden"
                    flexDirection="column"
                >
                    <MemoryRouter initialEntries={["/feed", lastViewedPath]} initialIndex={1}>
                        <CustomSwitch>
                            <Route path="/" exact>
                                <Auth />
                            </Route>
                            <Route path="/login" exact>
                                <Login sceneId={sceneId} />
                            </Route>
                            <Route path="/feed" exact>
                                <Feed />
                            </Route>
                            <Route path="/post/:id">
                                <Post />
                            </Route>
                            <Route path="/filters">
                                <Filters />
                            </Route>
                            <Route path="/settings">
                                <Settings sceneId={sceneId} />
                            </Route>
                        </CustomSwitch>
                    </MemoryRouter>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.ditio.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} testId={`${featuresConfig.ditio.key}-widget-menu-fab`} />
        </>
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
            history.push(`/post/${clickedMarker}`);
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
