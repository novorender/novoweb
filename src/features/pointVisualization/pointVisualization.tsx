import { Box, ListItemText, Menu, MenuItem, MenuProps, Typography } from "@mui/material";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MemoryRouter, Route, Switch, useHistory, useLocation } from "react-router-dom";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { selectDefaultPointVisualization, selectPoints, selectTerrain, selectViewMode } from "features/render";
import WidgetList from "features/widgetList/widgetList";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";
import { ViewMode } from "types/misc";

import { Header } from "./components/header";
import { MethodPicker } from "./components/methodPicker";
import { ClassificationView } from "./routes/classification";
import { CsvImportView } from "./routes/csvImportView";
import { ElevationView } from "./routes/elevation";
import { IntensityView } from "./routes/intensity";
import { RgbView } from "./routes/rgb";
import { selectPointVisualizationOriginalState } from "./selectors";
import { pointVisualizationActions } from "./slice";

export default function PointVisualization() {
    const defaultPointVisualization = useAppSelector(selectDefaultPointVisualization);

    return (
        <MemoryRouter initialEntries={[`/${defaultPointVisualization.kind}`]}>
            <PointVisualizationInner />
        </MemoryRouter>
    );
}

function PointVisualizationInner() {
    const [menuOpen, toggleMenu] = useToggle();
    const { t } = useTranslation();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.pointVisualization.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.pointVisualization.key);
    const dispatch = useAppDispatch();
    const defaultPointVisualization = useAppSelector(selectDefaultPointVisualization);
    const isEditing = useAppSelector(selectPointVisualizationOriginalState) !== undefined;
    const isDeviationMode = useAppSelector(selectViewMode) === ViewMode.Deviations;
    const location = useLocation();
    const history = useHistory();

    useEffect(() => {
        return () => {
            dispatch(pointVisualizationActions.setOriginalState(undefined));
        };
    }, [dispatch]);

    useEffect(() => {
        const path = `/${defaultPointVisualization.kind}`;
        if (path !== history.location.pathname) {
            history.push(path);
        }
    }, [history, defaultPointVisualization]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    menuOpen={menuOpen}
                    toggleMenu={toggleMenu}
                    WidgetMenu={WidgetMenu}
                    widget={featuresConfig.pointVisualization}
                    disableShadow={menuOpen || isEditing}
                />

                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexDirection="column"
                    flexGrow={1}
                    overflow="hidden"
                >
                    {isDeviationMode ? (
                        <Typography textAlign="center" color="grey" m={2}>
                            {t("pointVisualizationIsCurrentlyControlledByDeviationsWidget")}
                        </Typography>
                    ) : (
                        <>
                            {location.pathname !== "/import-csv" && (
                                <>
                                    {isEditing && <Header />}
                                    <MethodPicker />
                                </>
                            )}
                            <Switch>
                                <Route path="/classification" exact>
                                    <ClassificationView />
                                </Route>
                                <Route path="/elevation" exact>
                                    <ElevationView />
                                </Route>
                                <Route path="/intensity" exact>
                                    <IntensityView />
                                </Route>
                                <Route path="/color" exact>
                                    <RgbView />
                                </Route>
                                <Route path="/import-csv" exact>
                                    <CsvImportView />
                                </Route>
                            </Switch>
                        </>
                    )}
                </Box>

                {menuOpen && <WidgetList widgetKey={featuresConfig.pointVisualization.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}

function WidgetMenu(props: MenuProps) {
    const { t } = useTranslation();
    const checkPermission = useCheckProjectPermission();
    const canManage = checkPermission(Permission.SceneManage);
    const isEditing = useAppSelector(selectPointVisualizationOriginalState) !== undefined;
    const points = useAppSelector(selectPoints);
    const terrain = useAppSelector(selectTerrain);
    const dispatch = useAppDispatch();

    if (!canManage) {
        return null;
    }

    return (
        <Menu {...props}>
            <MenuItem
                onClick={() => {
                    dispatch(
                        pointVisualizationActions.setOriginalState({
                            classificationColorGradient: points.classificationColorGradient,
                            elevationGradient: terrain.elevationGradient,
                            defaultPointVisualization: points.defaultPointVisualization,
                        }),
                    );
                    props.onClose?.({}, "backdropClick");
                }}
                disabled={isEditing}
            >
                <ListItemText>{t("edit")}</ListItemText>
            </MenuItem>
        </Menu>
    );
}
