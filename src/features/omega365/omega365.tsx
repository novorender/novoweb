import { Settings } from "@mui/icons-material";
import { Box, ListItemIcon, ListItemText, Menu, MenuItem, MenuProps } from "@mui/material";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { MemoryRouter, Route, Switch, useHistory } from "react-router-dom";

import { useGetOmega365ProjectConfigQuery } from "apis/dataV2/dataV2Api";
import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { LinearProgress, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import SimpleSnackbar from "components/simpleSnackbar";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import WidgetList from "features/widgetList/widgetList";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";

import ConfigEditor from "./routes/configEditor";
import Delete from "./routes/delete";
import OmegaRoot from "./routes/root";
import Save from "./routes/save";
import ViewEditor from "./routes/viewEditor";
import { selectOmega365Config, selectSnackbarMessage } from "./selectors";
import { omega365Actions } from "./slice";

export default function Omega365() {
    const { t } = useTranslation();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.omega365.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.omega365.key);
    const projectId = useExplorerGlobals(true).state.scene.id;
    const dispatch = useAppDispatch();

    const { data, isError, isLoading, isSuccess } = useGetOmega365ProjectConfigQuery({ projectId });

    useEffect(() => {
        if (isSuccess) {
            dispatch(
                omega365Actions.setConfig(
                    data ?? {
                        baseURL: "",
                        views: [],
                    },
                ),
            );
            dispatch(omega365Actions.setSelectedViewId(data?.views?.[0]?.id ?? null));
        }
    }, [dispatch, data, isSuccess]);

    return (
        <MemoryRouter>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    widget={featuresConfig.omega365}
                    WidgetMenu={WidgetMenu}
                    disableShadow
                    menuOpen={menuOpen}
                />
                {minimized || menuOpen ? null : isLoading ? (
                    <Box>
                        <LinearProgress />
                    </Box>
                ) : isError ? (
                    <Box p={1} pt={2}>
                        {t("omega365ConfigError")}
                    </Box>
                ) : (
                    <Switch>
                        <Route path="/config">
                            <ConfigEditor />
                        </Route>
                        <Route path="/newView">
                            <ViewEditor />
                        </Route>
                        <Route path="/editView/:id">
                            <ViewEditor />
                        </Route>
                        <Route path="/save">
                            <Save />
                        </Route>
                        <Route path="/delete/:id">
                            <Delete />
                        </Route>
                        <Route path="/">
                            <OmegaRoot projectId={projectId} menuOpen={menuOpen} minimized={minimized} />
                        </Route>
                    </Switch>
                )}
                {menuOpen && <WidgetList widgetKey={featuresConfig.omega365.key} onSelect={toggleMenu} />}
                <WidgetSnackbar />
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </MemoryRouter>
    );
}

function WidgetSnackbar() {
    const message = useAppSelector(selectSnackbarMessage);
    const dispatch = useAppDispatch();

    return (
        <SimpleSnackbar
            message={message}
            hideDuration={3000}
            close={() => dispatch(omega365Actions.setSnackbarMessage(null))}
        />
    );
}

function WidgetMenu(props: MenuProps) {
    const { t } = useTranslation();
    const history = useHistory();
    const config = useAppSelector(selectOmega365Config);
    const checkPermission = useCheckProjectPermission();
    const canManage = checkPermission(Permission.IntOmegaPims365Manage);
    const dispatch = useAppDispatch();

    if (!canManage) {
        return null;
    }

    return (
        <Menu {...props}>
            <MenuItem
                onClick={() => {
                    props.onClose?.({}, "backdropClick");
                    dispatch(omega365Actions.setConfigDraft(config));
                    history.push("/config");
                }}
            >
                <ListItemIcon>
                    <Settings fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t("settings")}</ListItemText>
            </MenuItem>
        </Menu>
    );
}
