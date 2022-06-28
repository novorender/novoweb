import { MemoryRouter, Route, Switch } from "react-router-dom";

import { useAppSelector } from "app/store";
import { LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

import { Login } from "./routes/login";
import { Equipment } from "./routes/equipment";

export function Leica() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.leica.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.leica.key;

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.leica} />
                <ScrollBox display={menuOpen || minimized ? "none" : "flex"} flexDirection="column" p={1}>
                    <MemoryRouter>
                        <Switch>
                            <Route path="/" exact>
                                <Login />
                            </Route>
                            <Route path="/equipment" exact>
                                <Equipment />
                            </Route>
                        </Switch>
                    </MemoryRouter>
                </ScrollBox>
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
