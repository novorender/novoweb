import { Add, Delete, Settings } from "@mui/icons-material";
import { ListItemIcon, ListItemText, Menu, MenuItem, MenuProps, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { useEffect } from "react";
import { MemoryRouter, Route, Switch, useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { LogoSpeedDial, Tooltip, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectIsAdminScene, selectMaximized, selectMinimized, selectProjectIsV2 } from "slices/explorer";
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
import { CrupdateColorStop } from "./routes/crupdateColorStop";
import { DeleteDeviation } from "./routes/deleteDeviation";
import { Deviation } from "./routes/deviation";
import { Root } from "./routes/root";
import { SaveDeviation } from "./routes/saveDeviation";
import { MAX_DEVIATION_PROFILE_COUNT, newDeviationForm, profileToDeviationForm } from "./utils";

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
                        <Route path="/deviation/save" exact>
                            <SaveDeviation />
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
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const history = useHistory();
    const isProjectV2 = useAppSelector(selectProjectIsV2);
    const calculationStatus = useAppSelector(selectDeviationCalculationStatus);
    const config = useAppSelector(selectDeviationProfiles);
    const selectedProfile = useAppSelector(selectSelectedProfile);
    const isDeviationFormSet = useAppSelector((state) => selectDeviationForm(state) !== undefined);
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(deviationsActions.setActive(true));
    }, [dispatch]);

    useListenCalculationState();

    useEffect(() => {
        dispatch(deviationsActions.setDeviationForm(undefined));
    }, [dispatch]);

    const closeMenu = () => {
        if (props.onClose) {
            props.onClose({}, "backdropClick");
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
                        disabled={!selectedProfile || isDeviationFormSet}
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
                        disabled={!selectedProfile || isDeviationFormSet}
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
                                    dispatch(deviationsActions.setDeviationForm(newDeviationForm()));
                                    history.push("/deviation/add");
                                }}
                                disabled={
                                    config.status !== AsyncStatus.Success ||
                                    config.data.profiles.length === MAX_DEVIATION_PROFILE_COUNT ||
                                    !isProjectV2 ||
                                    isDeviationFormSet
                                }
                            >
                                <ListItemIcon>
                                    <Add fontSize="small" />
                                </ListItemIcon>
                                <ListItemText>New</ListItemText>
                            </MenuItem>
                        </span>
                    </Tooltip>
                </div>
            </Tooltip>
        </Menu>
    );
}
