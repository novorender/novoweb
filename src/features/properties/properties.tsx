import { Settings } from "@mui/icons-material";
import { Box, ListItemIcon, ListItemText, Menu, MenuItem, MenuProps } from "@mui/material";
import { useTranslation } from "react-i18next";
import { matchPath, MemoryRouter, Route, Switch, useHistory, useLocation } from "react-router-dom";

import { useAppSelector } from "app/redux-store-interactions";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";
import { selectHasAdminCapabilities, selectMaximized, selectMinimized } from "slices/explorer";

import { Root } from "./routes/root";
import { StampSettings } from "./routes/stampSettings";

export default function Properties() {
    const sceneId = useSceneId();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.properties.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.properties.key);
    const [menuOpen, toggleMenu] = useToggle();

    return (
        <MemoryRouter>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader WidgetMenu={WidgetMenu} disableShadow widget={featuresConfig.properties} />
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
                        <Route path="/stamp-settings" exact>
                            <StampSettings sceneId={sceneId} />
                        </Route>
                    </Switch>
                </Box>
                {menuOpen && <WidgetList widgetKey={featuresConfig.properties.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </MemoryRouter>
    );
}

function WidgetMenu(props: MenuProps) {
    const { t } = useTranslation();
    const history = useHistory();
    const location = useLocation();
    const isAdmin = useAppSelector(selectHasAdminCapabilities);

    if (!isAdmin) {
        return null;
    }

    const stampSettingsPath = "/stamp-settings";
    const stampSettingsActive = matchPath(location.pathname, { path: stampSettingsPath, exact: true }) !== null;
    return (
        <Menu {...props}>
            <MenuItem
                selected={stampSettingsActive}
                onClick={() => {
                    if (!stampSettingsActive) {
                        history.push(stampSettingsPath);
                    }

                    if (props.onClose) {
                        props.onClose({}, "backdropClick");
                    }
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
