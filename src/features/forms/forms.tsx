import { Settings as SettingsIcon } from "@mui/icons-material";
import { Box, ListItemIcon, ListItemText, Menu, MenuItem, MenuProps } from "@mui/material";
import { PropsWithChildren, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { MemoryRouter, Route, Switch, SwitchProps, useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import { highlightCollectionsActions, useDispatchHighlightCollections } from "contexts/highlightCollections";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import { ObjectVisibility } from "features/render";
import { renderActions, selectMainObject } from "features/render/renderSlice";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";

import { useGoToSelectedForm } from "./hooks/useGoToSelectedForm";
import { Create, FormsList, LocationInstance, Object, SearchInstance, Templates } from "./routes";
import {
    CREATE_FROM_TEMPLATE_ROUTE,
    DELETE_TEMPLATE_ROUTE,
    DELETE_TEMPLATES_ROUTE,
    EDIT_TEMPLATE_ROUTE,
} from "./routes/constants";
import { Settings } from "./routes/settings";
import { DeleteTemplate } from "./routes/templates";
import { DeleteTemplatesConfirmation } from "./routes/templates/dialogs/deleteTemplatesConfirmation";
import { formsActions } from "./slice";

export default function Forms() {
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.forms.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.forms.key);

    return (
        <MemoryRouter>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader
                    menuOpen={menuOpen}
                    toggleMenu={toggleMenu}
                    WidgetMenu={WidgetMenu}
                    widget={featuresConfig.forms}
                    disableShadow={!menuOpen}
                />
                <Box
                    display={menuOpen || minimized ? "none" : "flex"}
                    flexDirection="column"
                    flexGrow={1}
                    overflow="hidden"
                >
                    <CustomSwitch>
                        <Route path="/" exact>
                            <Templates />
                        </Route>
                        <Route path="/forms/:templateId">
                            <FormsList />
                        </Route>
                        <Route path="/search-instance">
                            <SearchInstance />
                        </Route>
                        <Route path="/location-instance">
                            <LocationInstance />
                        </Route>
                        <Route path="/object/:id">
                            <Object />
                        </Route>
                        <Route path="/create">
                            <Create />
                        </Route>
                        <Route path={DELETE_TEMPLATE_ROUTE}>
                            <DeleteTemplate />
                        </Route>
                        <Route path={DELETE_TEMPLATES_ROUTE}>
                            <DeleteTemplatesConfirmation />
                        </Route>
                        <Route path={EDIT_TEMPLATE_ROUTE}>
                            <Create />
                        </Route>
                        <Route path={CREATE_FROM_TEMPLATE_ROUTE}>
                            <Create derived />
                        </Route>
                        <Route path="/settings">
                            <Settings />
                        </Route>
                    </CustomSwitch>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.forms.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </MemoryRouter>
    );
}

function CustomSwitch(props: PropsWithChildren<SwitchProps>) {
    const history = useHistory();
    const willUnmount = useRef(false);
    const dispatch = useAppDispatch();
    const mainObject = useAppSelector(selectMainObject);
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHighlightCollections = useDispatchHighlightCollections();

    useEffect(() => {
        if (mainObject !== undefined && !history.location.pathname.startsWith("/create")) {
            history.push(`/object/${mainObject}`);
        }
    }, [history, mainObject]);

    useEffect(() => {
        willUnmount.current = false;
        return () => {
            willUnmount.current = true;
        };
    }, []);

    useEffect(
        () => () => {
            if (willUnmount.current) {
                dispatch(formsActions.resetTemplatesFilters());
                dispatch(formsActions.setLastViewedPath(history.location.pathname));

                dispatchHighlighted(highlightActions.setIds([]));
                dispatchHighlightCollections(highlightCollectionsActions.clearAll());
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
                dispatchHighlighted(highlightActions.resetColor());
            }
        },
        [dispatch, history.location.pathname, dispatchHighlightCollections, dispatchHighlighted],
    );

    useGoToSelectedForm();

    return <Switch {...props} />;
}

function WidgetMenu(props: MenuProps) {
    const { t } = useTranslation();
    const history = useHistory();

    return (
        <Menu {...props}>
            <MenuItem
                onClick={() => {
                    history.push("/settings");
                    props.onClose?.({}, "backdropClick");
                }}
            >
                <ListItemIcon>
                    <SettingsIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{t("settings")}</ListItemText>
            </MenuItem>
        </Menu>
    );
}
