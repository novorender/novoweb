import {
    AddCircle,
    Delete,
    Edit,
    MoreVert,
    // CalendarToday,
    // PowerSettingsNew
} from "@mui/icons-material";
import {
    Button,
    Box,
    useTheme,
    Typography,
    IconButton,
    ListItem,
    List,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Link,
} from "@mui/material";
import { ScenePreview } from "@novorender/data-js-api";
import { useState, MouseEvent } from "react";

import { LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { CreateViewerScene } from "features/createViewerScene";
import { dataApi } from "app";
import { useToggle } from "hooks/useToggle";
import { useAppDispatch, useAppSelector } from "app/store";
import { explorerActions, selectMaximized, selectMinimized, selectViewerScenes } from "slices/explorerSlice";
import { renderActions, SceneEditStatus, selectEditingScene } from "slices/renderSlice";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";

export function ViewerScenes() {
    const viewerScenes = useAppSelector(selectViewerScenes);
    const editingScene = useAppSelector(selectEditingScene);
    const minimized = useAppSelector(selectMinimized) === featuresConfig.viewerScenes.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.viewerScenes.key;
    const [menuOpen, toggleMenu] = useToggle();
    const [modalOpen, toggleModalOpen] = useToggle();

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.viewerScenes}>
                    {!menuOpen && !minimized ? (
                        <Box display="flex" justifyContent="space-between">
                            {editingScene === undefined ? (
                                <Button onClick={toggleModalOpen} color="grey">
                                    <AddCircle sx={{ mr: 1 }} />
                                    Create viewer scene
                                </Button>
                            ) : (
                                <Button
                                    disabled={editingScene.status !== SceneEditStatus.Editing}
                                    onClick={toggleModalOpen}
                                    color="grey"
                                >
                                    <AddCircle sx={{ mr: 1 }} />
                                    Update viewer scene
                                </Button>
                            )}
                        </Box>
                    ) : null}
                </WidgetHeader>
                <ScrollBox display={menuOpen || minimized ? "none" : "block"} height={1} pb={2} mt={1}>
                    <Typography p={1} color="textSecondary">
                        Scenes: {viewerScenes.length}
                    </Typography>
                    <List sx={{ p: 0 }}>
                        {viewerScenes.map((viewerScene) => (
                            <SceneListItem viewerScene={viewerScene} key={viewerScene.id} />
                        ))}
                    </List>
                </ScrollBox>
                <CreateViewerScene
                    key={editingScene ? `${editingScene.id}${editingScene.status}` : "ADMIN"}
                    open={modalOpen}
                    onClose={toggleModalOpen}
                />
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.viewerScenes.key}
                    onSelect={toggleMenu}
                />
            </WidgetContainer>
            <LogoSpeedDial
                open={menuOpen}
                toggle={toggleMenu}
                testId={`${featuresConfig.viewerScenes.key}-widget-menu-fab`}
            />
        </>
    );
}

function SceneListItem({ viewerScene }: { viewerScene: ScenePreview }) {
    const theme = useTheme();
    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
    const editingScene = useAppSelector(selectEditingScene);
    const dispatch = useAppDispatch();

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const toggleEditScene = () => {
        if (!editingScene || viewerScene.id !== editingScene.id) {
            dispatch(renderActions.initViewerSceneEditing(viewerScene.id));
        } else if (editingScene.status === SceneEditStatus.Editing) {
            dispatch(renderActions.initViewerSceneEditing(""));
        }
    };

    const deleteScene = async () => {
        // TODO(OLA): confirmation
        await dataApi.deleteScene(viewerScene.id);

        dispatch(explorerActions.deleteViewerScene(viewerScene.id));

        if (editingScene?.id === viewerScene.id) {
            dispatch(renderActions.initViewerSceneEditing(""));
        }
    };

    return (
        <ListItem disableGutters button sx={{ px: 1, py: 0 }}>
            <Box display="flex" width={1} alignItems="center">
                <Link
                    target="_blank"
                    underline="none"
                    color="text.primary"
                    href={`${window.location.origin}/${viewerScene.id}`}
                    sx={{ flex: "1 1 100%", width: 0, "&:hover": { color: theme.palette.info.main } }}
                >
                    {viewerScene.title}
                </Link>
                <IconButton
                    size="small"
                    onClick={toggleEditScene}
                    color={editingScene?.id === viewerScene.id ? "primary" : "default"}
                >
                    <Edit fontSize="small" />
                </IconButton>

                <Menu
                    onClick={(e) => e.stopPropagation()}
                    anchorEl={menuAnchor}
                    open={Boolean(menuAnchor)}
                    onClose={closeMenu}
                    id={viewerScene.id}
                    MenuListProps={{ sx: { maxWidth: "100%" } }}
                >
                    {/* <MenuItem onClick={() => {}}>
                            <ListItemIcon>
                                <PowerSettingsNew fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>On / Off</ListItemText>
                        </MenuItem>
                        <MenuItem onClick={() => {}}>
                            <ListItemIcon>
                                <CalendarToday fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Date</ListItemText>
                        </MenuItem> */}
                    <MenuItem onClick={deleteScene}>
                        <ListItemIcon>
                            <Delete fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Delete</ListItemText>
                    </MenuItem>
                </Menu>
                <IconButton
                    size="small"
                    onClick={openMenu}
                    aria-controls={viewerScene.id}
                    color={Boolean(menuAnchor) ? "primary" : "default"}
                    aria-haspopup="true"
                >
                    <MoreVert />
                </IconButton>
            </Box>
        </ListItem>
    );
}
