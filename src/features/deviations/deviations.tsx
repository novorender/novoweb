import { Add, Delete, RestartAlt, Settings } from "@mui/icons-material";
import { Divider, ListItemIcon, ListItemText, Menu, MenuItem, MenuProps, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { useCalcDeviationsMutation } from "apis/dataV2/dataV2Api";
import { MemoryRouter, Route, Switch, useHistory } from "react-router-dom";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { LogoSpeedDial, Tooltip, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { isInternalGroup, useObjectGroups } from "contexts/objectGroups";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectIsAdminScene, selectMaximized, selectMinimized, selectProjectIsV2 } from "slices/explorerSlice";
import { AsyncStatus } from "types/misc";

import {
    deviationsActions,
    selectDeviationCalculationStatus,
    selectDeviationForm,
    selectDeviationProfiles,
    selectSelectedProfile,
} from "./deviationsSlice";
import { DeviationCalculationStatus } from "./deviationTypes";
import { useListenCalculationState } from "./hooks/useListenCalculationState";
import { updateObjectIds } from "./hooks/useSaveDeviationConfig";
import { CrupdateColorStop } from "./routes/crupdateColorStop";
import { DeleteDeviation } from "./routes/deleteDeviation";
import { Deviation } from "./routes/deviation";
import { Root } from "./routes/root";
import { MAX_DEVIATION_PROFILE_COUNT, profileToDeviationForm, uiConfigToServerConfig } from "./utils";

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
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const history = useHistory();
    const isProjectV2 = useAppSelector(selectProjectIsV2);
    const calculationStatus = useAppSelector(selectDeviationCalculationStatus);
    const config = useAppSelector(selectDeviationProfiles);
    const selectedProfile = useAppSelector(selectSelectedProfile);
    const isDeviationFormSet = useAppSelector((state) => selectDeviationForm(state) !== undefined);
    const dispatch = useAppDispatch();
    const objectGroups = useObjectGroups().filter((grp) => !isInternalGroup(grp));

    useListenCalculationState();

    const [calcDeviations] = useCalcDeviationsMutation();

    const closeMenu = () => {
        if (props.onClose) {
            props.onClose({}, "backdropClick");
        }
    };

    const handleCalculateDeviations = async () => {
        if (config.status !== AsyncStatus.Success) {
            return;
        }

        dispatch(deviationsActions.setCalculationStatus({ status: DeviationCalculationStatus.Running }));

        try {
            let success = false;
            if (isProjectV2) {
                const serverConfig = uiConfigToServerConfig(updateObjectIds(config.data, objectGroups));
                await calcDeviations({ projectId: scene.id, config: serverConfig }).unwrap();

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
                        data: { ...config.data, rebuildRequired: false },
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
                        onClick={() => {
                            closeMenu();
                            const deviationForm = profileToDeviationForm(selectedProfile!);
                            dispatch(deviationsActions.setDeviationForm(deviationForm));
                            history.push("/deviation/edit");
                        }}
                        disabled={!selectedProfile}
                    >
                        <ListItemIcon>
                            <Settings fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Settings</ListItemText>
                    </MenuItem>
                    <MenuItem
                        onClick={() => {
                            closeMenu();
                            history.push("/deviation/delete", { id: selectedProfile!.id! });
                        }}
                        disabled={!selectedProfile}
                    >
                        <ListItemIcon>
                            <Delete fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Remove</ListItemText>
                    </MenuItem>
                    <Tooltip
                        title={
                            config.status === AsyncStatus.Success &&
                            config.data.profiles.length === MAX_DEVIATION_PROFILE_COUNT
                                ? "Reached maximum supported amount of deviation profiles"
                                : ""
                        }
                    >
                        <span>
                            <MenuItem
                                onClick={() => {
                                    closeMenu();
                                    history.push("/deviation/delete", { id: selectedProfile!.id! });
                                }}
                                disabled={
                                    config.status !== AsyncStatus.Success ||
                                    config.data.profiles.length === MAX_DEVIATION_PROFILE_COUNT ||
                                    !isProjectV2
                                }
                            >
                                <ListItemIcon>
                                    <Add fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>New</ListItemText>
                            </MenuItem>
                        </span>
                    </Tooltip>
                    <Divider />
                    <MenuItem
                        onClick={handleCalculateDeviations}
                        disabled={
                            calculationStatus.status === DeviationCalculationStatus.Running ||
                            calculationStatus.status === DeviationCalculationStatus.Loading ||
                            isDeviationFormSet
                        }
                    >
                        <ListItemIcon>
                            <RestartAlt fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Calculate deviations</ListItemText>
                    </MenuItem>
                </div>
            </Tooltip>
        </Menu>
    );
}
