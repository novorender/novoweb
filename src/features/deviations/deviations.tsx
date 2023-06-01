import { ListItemIcon, ListItemText, Menu, MenuItem, MenuProps, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { RestartAlt } from "@mui/icons-material";
import { useEffect } from "react";
import { MemoryRouter, Route, Switch } from "react-router-dom";

import { dataApi } from "app";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { LogoSpeedDial, Tooltip, WidgetContainer, WidgetHeader } from "components";
import { useToggle } from "hooks/useToggle";
import { useSceneId } from "hooks/useSceneId";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectIsAdminScene, selectMaximized, selectMinimized } from "slices/explorerSlice";

import { deviationsActions, selectDeviationCalculationStatus, DeviationCalculationStatus } from "./deviationsSlice";
import { Root } from "./routes/root";
import { Deviation } from "./routes/deviation";
import { CrupdateColorStop } from "./routes/crupdateColorStop";

export default function Deviations() {
    const sceneId = useSceneId();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.deviations.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.deviations.key);

    return (
        <MemoryRouter>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.deviations} WidgetMenu={WidgetMenu} disableShadow />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexDirection="column"
                    flexGrow={1}
                    overflow="hidden"
                >
                    <Switch>
                        <Route path="/" exact>
                            <Root />
                        </Route>
                        <Route path="/deviation" exact>
                            <Deviation sceneId={sceneId} />
                        </Route>
                        <Route path="/deviation/add">
                            <CrupdateColorStop />
                        </Route>
                        <Route path="/deviation/edit/:idx">
                            <CrupdateColorStop />
                        </Route>
                    </Switch>
                </Box>

                {menuOpen && <WidgetList widgetKey={featuresConfig.deviations.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </MemoryRouter>
    );
}

function WidgetMenu(props: MenuProps) {
    const calculationStatus = useAppSelector(selectDeviationCalculationStatus);
    const dispatch = useAppDispatch();

    const {
        state: { scene_OLD: scene },
    } = useExplorerGlobals(true);
    const isAdminScene = useAppSelector(selectIsAdminScene);

    useEffect(() => {
        if (isAdminScene && calculationStatus.status === DeviationCalculationStatus.Initial) {
            getProcesses();
        }

        async function getProcesses() {
            dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Loading }));

            const processes = await dataApi.getProcesses();
            const activeProcess = processes.filter((p) => p.id === scene.id)[0];

            if (!activeProcess) {
                dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Inactive }));
                return;
            }

            if (activeProcess.state.toLowerCase() === "active" || activeProcess.state.toLowerCase() === "running") {
                dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Running }));
            } else {
                dispatch(
                    deviationsActions.setCalculationStatus({
                        status: DeviationCalculationStatus.Error,
                        error: activeProcess.state,
                    })
                );
            }
        }
    }, [dispatch, scene, calculationStatus, isAdminScene]);

    const handleCalculateDeviations = async () => {
        dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Running }));
        const res = await dataApi.fetch(`deviations/${scene.id}`).then((r) => r.json());

        if (res.success) {
            dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Running }));
        } else {
            dispatch(
                deviationsActions.setCalculationStatus({
                    status: DeviationCalculationStatus.Error,
                    error: res.error ?? "Unknown error calculating deviations",
                })
            );
        }
    };

    if (!isAdminScene) {
        return null;
    }

    return (
        <Menu {...props}>
            <Tooltip
                title={
                    calculationStatus.status === DeviationCalculationStatus.Error ? (
                        <Typography>{calculationStatus.error} </Typography>
                    ) : calculationStatus.status === DeviationCalculationStatus.Running ? (
                        "Running..."
                    ) : (
                        ""
                    )
                }
            >
                <div>
                    <MenuItem
                        onClick={handleCalculateDeviations}
                        disabled={
                            calculationStatus.status === DeviationCalculationStatus.Running ||
                            calculationStatus.status === DeviationCalculationStatus.Loading
                        }
                    >
                        <>
                            <ListItemIcon>
                                <RestartAlt fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Calculate deviations</ListItemText>
                        </>
                    </MenuItem>
                </div>
            </Tooltip>
        </Menu>
    );
}
