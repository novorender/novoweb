import { ArrowBack, Close, Save } from "@mui/icons-material";
import {
    Box,
    Button,
    FormControlLabel,
    IconButton,
    List,
    ListItemButton,
    Snackbar,
    Typography,
    useTheme,
} from "@mui/material";
import { FormEventHandler, useState } from "react";
import { useHistory } from "react-router-dom";

import { Divider, IosSwitch, ScrollBox, TextField } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { AsyncStatus } from "types/misc";
import { dataApi } from "app";
import { selectIsAdminScene } from "slices/explorerSlice";

import { propertiesActions, selectPropertiesStampSettings } from "../slice";

export function StampSettings({ sceneId }: { sceneId: string }) {
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const settings = useAppSelector(selectPropertiesStampSettings);
    const [saveStatus, setSaveStatus] = useState(AsyncStatus.Initial);

    const [input, setInput] = useState("");

    const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        const trimmed = input.trim();

        if (trimmed) {
            dispatch(propertiesActions.addStampProperties(trimmed));
        }

        setInput("");
    };

    const handleSave = async () => {
        if (saveStatus !== AsyncStatus.Initial) {
            return;
        }

        setSaveStatus(AsyncStatus.Loading);

        try {
            const res = await dataApi.loadScene(sceneId);

            if ("error" in res) {
                throw new Error("Error loading scene");
            }

            const { url: _url, customProperties = {}, ...originalScene } = res;

            dataApi.putScene({
                ...originalScene,
                url: isAdminScene ? scene.id : `${sceneId}:${scene.id}`,
                customProperties: {
                    ...customProperties,
                    properties: {
                        stampSettings: settings,
                    },
                },
            });
            setSaveStatus(AsyncStatus.Success);
        } catch {
            setSaveStatus(AsyncStatus.Error);
            console.warn("Failed to save Xsite Manage settings.");
        }
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => history.goBack()} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        Back
                    </Button>
                    <FormControlLabel
                        sx={{ ml: 2 }}
                        control={
                            <IosSwitch
                                size="medium"
                                color="primary"
                                checked={settings.enabled}
                                onChange={() => dispatch(propertiesActions.toggleEnableStamp())}
                            />
                        }
                        label={
                            <Box fontSize={14} sx={{ userSelect: "none" }}>
                                Enabled
                            </Box>
                        }
                    />
                    <Button disabled={saveStatus !== AsyncStatus.Initial} onClick={handleSave} color="grey">
                        <Save sx={{ mr: 1 }} />
                        Save
                    </Button>
                </Box>
            </Box>
            <Box p={1} mt={1} mb={2} display="flex" component="form" onSubmit={handleSubmit}>
                <TextField
                    fullWidth
                    label="Add property"
                    sx={{ mr: 1 }}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <Button variant="contained" type="submit">
                    Add
                </Button>
            </Box>
            <ScrollBox pb={3}>
                <Typography px={1} fontWeight={600}>
                    Properties
                </Typography>
                <Divider sx={{ mt: 1 }} />
                {!settings.properties.length ? (
                    <Typography p={1}>No properties added.</Typography>
                ) : (
                    <List dense disablePadding>
                        {settings.properties.map((property, idx) => (
                            <ListItemButton key={property} disableGutters sx={{ px: 1 }}>
                                <Box
                                    sx={{
                                        display: "flex",
                                        width: 0,
                                        flex: "1 1 100%",
                                    }}
                                >
                                    <Typography noWrap={true}>{property}</Typography>
                                </Box>
                                <IconButton
                                    size="small"
                                    onClick={() => dispatch(propertiesActions.removeStampPropertyIndex(idx))}
                                >
                                    <Close />
                                </IconButton>
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </ScrollBox>
            <Snackbar
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                sx={{
                    width: { xs: "auto", sm: 350 },
                    bottom: { xs: "auto", sm: 24 },
                    top: { xs: 24, sm: "auto" },
                }}
                autoHideDuration={2500}
                open={[AsyncStatus.Error, AsyncStatus.Success].includes(saveStatus)}
                onClose={() => setSaveStatus(AsyncStatus.Initial)}
                message={saveStatus === AsyncStatus.Error ? "An error occurred." : "Settings successfully saved."}
                action={
                    <IconButton
                        size="small"
                        aria-label="close"
                        color="inherit"
                        onClick={() => setSaveStatus(AsyncStatus.Initial)}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                }
            />
        </>
    );
}
