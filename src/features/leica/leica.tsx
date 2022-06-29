import { PropsWithChildren, useRef, useEffect } from "react";
import { MemoryRouter, Route, Switch, SwitchProps, useLocation } from "react-router-dom";
import { Box } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

import { Login } from "./routes/login";
import { Project } from "./routes/project";
import { leicaActions, selectLastViewedPath } from "./leicaSlice";
import { Equipment } from "./routes/equipment";

export function Leica() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.leica.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.leica.key;
    const lastViewedPath = useAppSelector(selectLastViewedPath);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.leica} disableShadow={true} />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexDirection="column"
                    flexGrow={1}
                    overflow="hidden"
                >
                    <MemoryRouter initialEntries={["/project", lastViewedPath]} initialIndex={1}>
                        <CustomSwitch>
                            <Route path="/" exact>
                                <Login />
                            </Route>
                            <Route path="/project" exact>
                                <Project />
                            </Route>
                            <Route path="/equipment" exact>
                                <Equipment />
                            </Route>
                        </CustomSwitch>
                    </MemoryRouter>
                </Box>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.leica.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} testId={`${featuresConfig.leica.key}-widget-menu-fab`} />
        </>
    );
}

function CustomSwitch(props: PropsWithChildren<SwitchProps>) {
    const location = useLocation();
    const willUnmount = useRef(false);
    const dispatch = useAppDispatch();

    useEffect(() => {
        return () => {
            willUnmount.current = true;
        };
    }, []);

    useEffect(() => {
        return () => {
            if (willUnmount.current) {
                dispatch(leicaActions.setLastViewedPath(location.pathname));
            }
        };
    }, [location, dispatch]);

    return <Switch {...props} />;
}
