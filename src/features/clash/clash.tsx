import { Box } from "@mui/material";
import { MemoryRouter, Route, Switch } from "react-router-dom";

import { useAppSelector } from "app/redux-store-interactions";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";

import ClashList from "./routes/clashList";
import ProfileList from "./routes/profileList";

export default function Clash() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.clash.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.clash.key);

    return (
        <MemoryRouter>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader menuOpen={menuOpen} toggleMenu={toggleMenu} widget={featuresConfig.clash} disableShadow />

                <Box
                    display={!menuOpen && !minimized ? "flex" : "none"}
                    flexDirection="column"
                    overflow="hidden"
                    height={1}
                >
                    <Switch>
                        <Route path="/profiles/:id/clashes">
                            <ClashList />
                        </Route>
                        <Route path="/">
                            <ProfileList />
                        </Route>
                    </Switch>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.clash.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </MemoryRouter>
    );
}
