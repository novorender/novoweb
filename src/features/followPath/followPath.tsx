import { Box } from "@mui/material";
import { PropsWithChildren, useEffect, useRef } from "react";
import { MemoryRouter, Route, Switch, SwitchProps, useHistory, useLocation } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";

import { followPathActions, selectGoToRouterPath, selectLastViewedRouterPath } from "./followPathSlice";
import { FollowParametricFromIds } from "./routes/followParametrcFromId";
import { FollowParametricFromPos } from "./routes/followParametricFromPos";
import { PathList } from "./routes/pathList";

export default function FollowPath() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.followPath.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.followPath.key);
    const lastViewedRouterPath = useAppSelector(selectLastViewedRouterPath);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.followPath} disableShadow />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexDirection="column"
                    flexGrow={1}
                    overflow="hidden"
                >
                    <MemoryRouter initialEntries={["/", lastViewedRouterPath]} initialIndex={1}>
                        <CustomSwitch>
                            <Route path="/" exact>
                                <PathList />
                            </Route>
                            <Route path="/followPos" exact>
                                <FollowParametricFromPos />
                            </Route>
                            <Route path="/followIds" exact>
                                <FollowParametricFromIds />
                            </Route>
                        </CustomSwitch>
                    </MemoryRouter>
                </Box>

                {menuOpen && <WidgetList widgetKey={featuresConfig.followPath.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}

function CustomSwitch(props: PropsWithChildren<SwitchProps>) {
    const location = useLocation();
    const history = useHistory();
    const goTo = useAppSelector(selectGoToRouterPath);
    const dispatch = useAppDispatch();
    const willUnmount = useRef(false);

    useEffect(() => {
        return () => {
            willUnmount.current = true;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (willUnmount.current) {
                dispatch(followPathActions.setLastViewedRouterPath(location.pathname));
            }
        };
    }, [location.pathname, dispatch]);

    useEffect(() => {
        if (goTo) {
            dispatch(followPathActions.setGoToRouterPath(""));
            history.replace(goTo);
        }
    }, [history, goTo, dispatch]);

    return <Switch {...props} />;
}
