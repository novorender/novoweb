import { MemoryRouter, Route, Switch } from "react-router-dom";
import { Box } from "@mui/material";

import { useAppSelector } from "app/store";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { useSceneId } from "hooks/useSceneId";

import { Auth } from "./routes/auth";
import { Login } from "./routes/login";
import { Issues } from "./routes/issues";
import { Settings } from "./routes/settings";
import { Filters } from "./routes/filters";
import { Issue } from "./routes/issue";
import { CreateIssue } from "./routes/create";

export function Jira() {
    const sceneId = useSceneId();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.jira.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.jira.key;

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.jira} disableShadow={!menuOpen && !minimized} />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexDirection="column"
                    flexGrow={1}
                    overflow="hidden"
                >
                    <MemoryRouter>
                        <Switch>
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
                                <Issue />
                            </Route>
                            <Route path="/create">
                                <CreateIssue />
                            </Route>
                        </Switch>
                    </MemoryRouter>
                </Box>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.jira.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} testId={`${featuresConfig.jira.key}-widget-menu-fab`} />
        </>
    );
}
