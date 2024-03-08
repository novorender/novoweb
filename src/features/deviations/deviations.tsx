import { RestartAlt } from "@mui/icons-material";
import { ListItemIcon, ListItemText, Menu, MenuItem, MenuProps, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { useCalcDeviationsMutation } from "apis/dataV2/dataV2Api";
import { MemoryRouter, Route, Switch } from "react-router-dom";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { LogoSpeedDial, Tooltip, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectIsAdminScene, selectMaximized, selectMinimized, selectProjectIsV2 } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";

import {
    deviationsActions,
    selectDeviationCalculationStatus,
    selectDeviationForm,
    selectDeviationProfiles,
} from "./deviationsSlice";
import { DeviationCalculationStatus } from "./deviationTypes";
import { useListenCalculationState } from "./hooks/useListenCalculationState";
import { CrupdateColorStop } from "./routes/crupdateColorStop";
import { DeleteDeviation } from "./routes/deleteDeviation";
import { Deviation } from "./routes/deviation";
import { Root } from "./routes/root";
import { uiConfigToServerConfig } from "./utils";

export default function Deviations() {
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
                        <Route path="/deviation/add" exact>
                            <Deviation />
                        </Route>
                        <Route path="/deviation/edit" exact>
                            <Deviation />
                        </Route>
                        <Route path="/deviation/delete" exact>
                            <DeleteDeviation />
                        </Route>
                        <Route path="/deviation/addColorStop" exact>
                            <CrupdateColorStop />
                        </Route>
                        <Route path="/deviation/editColorStop/:idx">
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
    const isProjectV2 = useAppSelector(selectProjectIsV2);
    const calculationStatus = useAppSelector(selectDeviationCalculationStatus);
    const profiles = useAppSelector(selectDeviationProfiles);
    const isDeviationFormSet = useAppSelector((state) => selectDeviationForm(state) !== undefined);
    const dispatch = useAppDispatch();

    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const isAdminScene = useAppSelector(selectIsAdminScene);

    useListenCalculationState();

    const [calcDeviations] = useCalcDeviationsMutation();

    const handleCalculateDeviations = async () => {
        if (profiles.status !== AsyncStatus.Success) {
            return;
        }

        dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Running }));

        try {
            let success = false;
            if (isProjectV2) {
                await calcDeviations({ projectId: scene.id, config: uiConfigToServerConfig(profiles.data) }).unwrap();

                success = true;
            } else {
                const res = await dataApi.fetch(`deviations/${scene.id}`).then((r) => r.json());

                if (!res.success) {
                    dispatch(
                        deviationsActions.setCalculationStatus({
                            status: DeviationCalculationStatus.Error,
                            error: res.error ?? "Unknown error calculating deviations",
                        })
                    );
                }
            }

            if (success) {
                dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Running }));
                dispatch(
                    deviationsActions.setProfiles({
                        status: AsyncStatus.Success,
                        data: { ...profiles.data, rebuildRequired: false },
                    })
                );
            }
        } catch (ex) {
            console.warn(ex);
            dispatch(
                deviationsActions.setCalculationStatus({
                    status: DeviationCalculationStatus.Error,
                    error: "Unknown error calculating deviations",
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
                            calculationStatus.status === DeviationCalculationStatus.Loading ||
                            isDeviationFormSet
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
