import {
    IconButton,
    Modal,
    Paper,
    Typography,
    FormControlLabel,
    Checkbox,
    Grid,
    Button,
    Snackbar,
    Alert,
    Box,
} from "@mui/material";
import Close from "@mui/icons-material/Close";
import { DatePicker, LoadingButton } from "@mui/lab";
import { FormEventHandler, useState } from "react";
import { format } from "date-fns";
import { v4 as uuidv4 } from "uuid";
import { RenderSettings } from "@novorender/webgl-api";

import { TextField } from "components";
import { viewerWidgets } from "config/features";
import { dataApi } from "app";
import { useToggle } from "hooks/useToggle";
import { useMountedState } from "hooks/useMountedState";

import { useAppDispatch, useAppSelector } from "app/store";
import { renderActions, selectBookmarks, selectCurrentEnvironment, selectEditingScene } from "slices/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useHighlighted } from "contexts/highlighted";
import { useHidden } from "contexts/hidden";
import { useCustomGroups } from "contexts/customGroups";
import { explorerActions } from "slices/explorerSlice";
import { Save } from "@mui/icons-material";

const today = new Date();

enum Status {
    Initial,
    Saving,
    Failed,
}

export function CreateViewerScene({ open, onClose }: { open: boolean; onClose: () => void }) {
    const {
        state: { scene, view },
    } = useExplorerGlobals(true);
    const { state: customGroups } = useCustomGroups();
    const highlighted = useHighlighted();
    const hidden = useHidden();

    const dispatch = useAppDispatch();
    const bookmarks = useAppSelector(selectBookmarks);
    const currentEnv = useAppSelector(selectCurrentEnvironment);
    const editingScene = useAppSelector(selectEditingScene);
    const updating = Boolean(editingScene?.id);

    const [status, setStatus] = useMountedState(Status.Initial);
    const [title, setTitle] = useState(editingScene?.title ?? "");
    const [enabledFeatures, setEnabledFeatures] = useState(editingScene?.enabledFeatures ?? []);
    const [dateLimit, setDateLimit] = useState(editingScene?.expiration ?? "");
    const [requireAuth, toggleRequireAuth] = useToggle(Boolean(editingScene?.requireAuth ?? true));

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();
        setStatus(Status.Saving);

        const id = editingScene?.id || uuidv4();
        const { display: _display, ...settings } = { ...view.settings, environment: currentEnv?.name };

        const res = await dataApi.putScene({
            title,
            bookmarks,
            settings: settings as RenderSettings,
            url: `${id}:${scene.id}`,
            camera: view.camera.controller.params,
            objectGroups: customGroups.concat([
                {
                    id: "",
                    name: "highlighted",
                    ids: highlighted.idArr,
                    color: highlighted.color,
                    selected: true,
                    hidden: false,
                },
                {
                    id: "",
                    name: "hidden",
                    ids: hidden.idArr,
                    color: [1, 0, 0],
                    selected: true,
                    hidden: false,
                },
            ]),
            customProperties: {
                enabledFeatures: Object.fromEntries(
                    (enabledFeatures.map((feat) => [feat, true]) as [string, any])
                        .concat(requireAuth ? [["enabledOrgs", []]] : [])
                        .concat(dateLimit ? [["expiration", dateLimit]] : [])
                ),
            },
        });

        if (!res) {
            setStatus(Status.Failed);
            return;
        }

        if (updating) {
            dispatch(explorerActions.updateViewerScene({ id, title }));
        } else {
            dispatch(explorerActions.addViewerScene({ id, title }));
        }

        dispatch(renderActions.initViewerSceneEditing(""));
        onClose();
    };

    return (
        <Modal sx={{ display: "flex", justifyContent: "center", alignItems: "center" }} open={open} onClose={onClose}>
            <Paper sx={{ minWidth: 300, maxWidth: 720, width: 1, padding: 2 }}>
                <Box mb={3} display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" component="h2">
                        {updating ? "Update" : "Create"} viewer scene
                    </Typography>
                    <IconButton size="small" onClick={onClose}>
                        <Close />
                    </IconButton>
                </Box>
                <form onSubmit={handleSubmit}>
                    <Box display="flex" mb={2}>
                        <TextField
                            autoFocus={!updating}
                            id={"scene-title"}
                            label={"Scene name"}
                            fullWidth
                            required
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            sx={{ mr: 2 }}
                        />
                        <DatePicker
                            disabled={!requireAuth}
                            label="Date limit"
                            minDate={today}
                            value={dateLimit || null}
                            onChange={(newDate: Date | null) =>
                                setDateLimit(newDate ? format(newDate, "yyyy-MM-dd") : "")
                            }
                            renderInput={(params) => <TextField {...params} />}
                        />
                    </Box>
                    <Grid container mb={2}>
                        <Grid item md={4} xs={6}>
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        size="small"
                                        color="primary"
                                        checked={requireAuth}
                                        onChange={toggleRequireAuth}
                                    />
                                }
                                label={<Box mr={0.5}>Require authentication</Box>}
                            />
                        </Grid>
                        {viewerWidgets.map((widget) => (
                            <Grid item md={4} xs={6} key={widget.key}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            size="small"
                                            color="primary"
                                            checked={enabledFeatures.includes(widget.key)}
                                            onChange={(e) =>
                                                e.target.checked
                                                    ? setEnabledFeatures((state) => state.concat(widget.key))
                                                    : setEnabledFeatures((state) =>
                                                          state.filter((key) => widget.key !== key)
                                                      )
                                            }
                                        />
                                    }
                                    label={<Box mr={0.5}>{widget.name}</Box>}
                                />
                            </Grid>
                        ))}
                    </Grid>

                    <Box display="flex" justifyContent="space-between">
                        <Button size="large" color="grey" type="button" variant="outlined" onClick={onClose}>
                            Cancel
                        </Button>
                        <LoadingButton
                            loading={status === Status.Saving}
                            loadingPosition="start"
                            startIcon={<Save />}
                            size="large"
                            type="submit"
                            disabled={!title.trim()}
                            color="primary"
                            variant="contained"
                        >
                            {updating ? "Save" : "Create"}
                        </LoadingButton>
                    </Box>
                </form>
                <Snackbar
                    open={status === Status.Failed}
                    anchorOrigin={{ vertical: "top", horizontal: "center" }}
                    autoHideDuration={6000}
                    onClose={() => setStatus(Status.Initial)}
                    action={
                        <IconButton
                            size="small"
                            aria-label="close"
                            color="inherit"
                            onClick={() => setStatus(Status.Initial)}
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    }
                >
                    <Alert variant="filled" severity="error">
                        Failed to {updating ? "update" : "create"} scene
                    </Alert>
                </Snackbar>
            </Paper>
        </Modal>
    );
}
