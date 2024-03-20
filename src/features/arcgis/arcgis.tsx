import { Box } from "@mui/material";
import { MemoryRouter, Route, Switch } from "react-router-dom";

import { useAppSelector } from "app";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";

import { ArcgisSnackbar } from "./components/arcgisSnackbar";
import { ViewSwitch } from "./components/viewSwitch";
import { WidgetMenu } from "./components/widgetMenu";
import { useLoadArcgisWidgetConfig } from "./hooks/useLoadArcgisWidgetConfig";
import { useLoadFeaturesAndDefinition } from "./hooks/useLoadFeaturesAndDefinition";
import { useLoadFeatureServerDefinition } from "./hooks/useLoadFeatureServerDefinition";
import { DeleteFeatureServer } from "./routes/deleteFeatureServer";
import { EditFeatureServer } from "./routes/editFeatureServer";
import FeatureInfo from "./routes/featureInfo";
import { FeatureServerList } from "./routes/featureServerList";
import { LayerFilter } from "./routes/layerFilter";
import { Save } from "./routes/save";

export default function Arcgis() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.arcgis.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.arcgis.key);

    useLoadArcgisWidgetConfig();
    useLoadFeatureServerDefinition();
    useLoadFeaturesAndDefinition();

    return (
        <MemoryRouter>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader WidgetMenu={WidgetMenu} widget={featuresConfig.arcgis} disableShadow />

                <ArcgisSnackbar />

                {minimized ? null : menuOpen ? (
                    <WidgetList widgetKey={featuresConfig.arcgis.key} onSelect={toggleMenu} />
                ) : (
                    <>
                        <ViewSwitch />
                        <Box
                            display={!menuOpen && !minimized ? "flex" : "none"}
                            flexDirection="column"
                            overflow="hidden"
                            height={1}
                        >
                            <Switch>
                                <Route path="/edit">
                                    <EditFeatureServer />
                                </Route>
                                <Route path="/save">
                                    <Save />
                                </Route>
                                <Route path="/remove">
                                    <DeleteFeatureServer />
                                </Route>
                                <Route path="/featureInfo">
                                    <FeatureInfo />
                                </Route>
                                <Route path="/layerFilter">
                                    <LayerFilter />
                                </Route>
                                <Route path="/">
                                    <FeatureServerList />
                                </Route>
                            </Switch>
                        </Box>
                    </>
                )}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </MemoryRouter>
    );
}
