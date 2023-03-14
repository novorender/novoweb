import { MemoryRouter, Route, Switch } from "react-router-dom";
import { Box } from "@mui/material";

import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useAppSelector } from "app/store";
import { useToggle } from "hooks/useToggle";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";

import { Root } from "./routes/root";
import { Filter } from "./routes/filter";

export default function Images() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.images.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.images.key);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.images} disableShadow />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexGrow={1}
                    overflow="hidden"
                    flexDirection="column"
                >
                    <MemoryRouter>
                        <Switch>
                            <Route path="/" exact>
                                <Root />
                            </Route>
                            <Route path="/filter" exact>
                                <Filter />
                            </Route>
                        </Switch>
                    </MemoryRouter>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.images.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
