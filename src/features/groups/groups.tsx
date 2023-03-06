import { matchPath, MemoryRouter, Route, Switch, useHistory, useLocation, useRouteMatch } from "react-router-dom";
import { Menu, MenuItem, ListItemIcon, ListItemText, MenuProps, Box, Snackbar, IconButton } from "@mui/material";
import { Close, Code } from "@mui/icons-material";

import { WidgetContainer, LogoSpeedDial, WidgetHeader } from "components";
import WidgetList from "features/widgetList/widgetList";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectMinimized, selectMaximized } from "slices/explorerSlice";
import { featuresConfig } from "config/features";
import { useToggle } from "hooks/useToggle";
import { useSceneId } from "hooks/useSceneId";
import { AsyncStatus } from "types/misc";

import { GroupList } from "./routes/groupList";
import { Crupdate } from "./routes/crupdate";
import { Save } from "./routes/save";
import { RenameCollection } from "./routes/renameCollection";
import { Delete } from "./routes/delete";
import { groupsActions, selectSaveStatus } from "./groupsSlice";

const crupdatePaths = ["/create", "/edit/:id"];

export default function Groups() {
    const sceneId = useSceneId();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.groups.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.groups.key);
    const saveStatus = useAppSelector(selectSaveStatus);
    const dispatch = useAppDispatch();

    const showSnackbar = [AsyncStatus.Success, AsyncStatus.Error].includes(saveStatus);

    return (
        <MemoryRouter>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.groups} WidgetMenu={WidgetMenu} disableShadow />

                {showSnackbar ? (
                    <Snackbar
                        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                        sx={{
                            width: { xs: "auto", sm: 350 },
                            bottom: { xs: "auto", sm: 24 },
                            top: { xs: 24, sm: "auto" },
                        }}
                        autoHideDuration={2500}
                        open={showSnackbar}
                        onClose={() => dispatch(groupsActions.setSaveStatus(AsyncStatus.Initial))}
                        message={
                            saveStatus === AsyncStatus.Error ? "Failed to save groups" : "Groups successfully saved"
                        }
                        action={
                            <IconButton
                                size="small"
                                aria-label="close"
                                color="inherit"
                                onClick={() => dispatch(groupsActions.setSaveStatus(AsyncStatus.Initial))}
                            >
                                <Close fontSize="small" />
                            </IconButton>
                        }
                    />
                ) : null}

                <Box
                    display={!menuOpen && !minimized ? "flex" : "none"}
                    flexDirection="column"
                    overflow="hidden"
                    height={1}
                >
                    <Switch>
                        <Route path="/" exact>
                            <GroupList />
                        </Route>
                        <Route path={crupdatePaths}>
                            <Crupdate sceneId={sceneId} />
                        </Route>
                        <Route path="/save">
                            <Save sceneId={sceneId} />
                        </Route>
                        <Route path="/delete/:id">
                            <Delete />
                        </Route>
                        <Route path="/renameCollection">
                            <RenameCollection />
                        </Route>
                    </Switch>
                </Box>

                {menuOpen && <WidgetList widgetKey={featuresConfig.groups.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} ariaLabel="toggle widget menu" />
        </MemoryRouter>
    );
}

export function WidgetMenu(props: MenuProps) {
    const location = useLocation();

    if (!matchPath(location.pathname, crupdatePaths)) {
        return null;
    }

    return (
        <Switch>
            <Route path={crupdatePaths} exact>
                <Menu {...props}>
                    <InputJsonMenuItem onClose={props.onClose} />
                </Menu>
            </Route>
        </Switch>
    );
}

function InputJsonMenuItem({ onClose }: { onClose: MenuProps["onClose"] }) {
    const history = useHistory();
    const match = useRouteMatch();

    return (
        <div>
            <MenuItem
                onClick={() => {
                    history.push(match.url + "/json");

                    if (onClose) {
                        onClose({}, "backdropClick");
                    }
                }}
            >
                <>
                    <ListItemIcon>
                        <Code />
                    </ListItemIcon>
                    <ListItemText>input JSON</ListItemText>
                </>
            </MenuItem>
        </div>
    );
}
