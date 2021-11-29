import { AddCircle, CalendarToday, Delete, Edit, MoreVert, PowerSettingsNew } from "@mui/icons-material";
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
    MenuList,
} from "@mui/material";
import { ScenePreview } from "@novorender/data-js-api";
import { useState, MouseEvent } from "react";

import { ScrollBox } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectViewerScenes } from "slices/explorerSlice";
import { renderActions, SceneEditStatus, selectEditingScene } from "slices/renderSlice";

export function ViewerScenes() {
    const theme = useTheme();
    const viewerScenes = useAppSelector(selectViewerScenes);
    const editingScene = useAppSelector(selectEditingScene);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader} display="flex" justifyContent="space-between">
                {editingScene === undefined ? (
                    <Button onClick={() => {}} color="grey">
                        <AddCircle sx={{ mr: 1 }} />
                        Generate viewer scene
                    </Button>
                ) : (
                    <Button disabled={editingScene.status !== SceneEditStatus.Editing} onClick={() => {}} color="grey">
                        <AddCircle sx={{ mr: 1 }} />
                        Update viewer scene
                    </Button>
                )}
            </Box>
            <ScrollBox height={1} pb={2} mt={1}>
                <Typography p={1} color="textSecondary">
                    Scenes: {viewerScenes.length}
                </Typography>
                <List sx={{ p: 0 }}>
                    {viewerScenes.map((viewerScene) => (
                        <SceneListItem viewerScene={viewerScene} key={viewerScene.id} />
                    ))}
                </List>
            </ScrollBox>
        </>
    );
}

function SceneListItem({ viewerScene }: { viewerScene: ScenePreview }) {
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

    return (
        <ListItem disableGutters button sx={{ px: 1, py: 0 }}>
            <Box display="flex" width={1} alignItems="center">
                <Typography sx={{ flex: "1 1 100%", width: 0 }}>{viewerScene.title}</Typography>
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
                >
                    <MenuList sx={{ maxWidth: "100%" }}>
                        <MenuItem onClick={() => {}}>
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
                        </MenuItem>
                        <MenuItem onClick={() => {}}>
                            <ListItemIcon>
                                <Delete fontSize="small" />
                            </ListItemIcon>
                            <ListItemText>Delete</ListItemText>
                        </MenuItem>
                    </MenuList>
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
