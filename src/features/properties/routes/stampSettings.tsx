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
import { FormEventHandler, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useSaveCustomPropertiesMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, IosSwitch, ScrollBox, TextField } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { loadScene } from "features/render/utils";
import { selectIsAdminScene } from "slices/explorer";
import { AsyncStatus } from "types/misc";
import { mergeRecursive } from "utils/misc";

import { propertiesActions, selectPropertiesStampSettings, selectStarredProperties } from "../slice";

export function StampSettings({ sceneId }: { sceneId: string }) {
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const settings = useAppSelector(selectPropertiesStampSettings);
    const starred = useAppSelector(selectStarredProperties);
    const [saveCustomProperties] = useSaveCustomPropertiesMutation();

    const [starredArr, setStarredArr] = useState(
        Object.keys(starred).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "accent" })),
    );
    const [saveStatus, setSaveStatus] = useState(AsyncStatus.Initial);
    const [input, setInput] = useState("");

    useEffect(() => {
        setStarredArr(Object.keys(starred).sort((a, b) => a.localeCompare(b, "en", { sensitivity: "accent" })));
    }, [starred]);

    const handleSubmit: FormEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        const trimmed = input.trim();

        if (trimmed) {
            dispatch(propertiesActions.star(trimmed));
        }

        setInput("");
    };

    const handleSave = async () => {
        if (saveStatus !== AsyncStatus.Initial) {
            return;
        }

        setSaveStatus(AsyncStatus.Loading);

        try {
            const [originalScene] = await loadScene(sceneId);

            if (originalScene.customProperties.explorerProjectState) {
                const updated = mergeRecursive(originalScene, {
                    url: isAdminScene ? scene.id : `${sceneId}:${scene.id}`,
                    customProperties: {
                        explorerProjectState: {
                            features: {
                                properties: {
                                    stamp: settings,
                                    starred: starredArr,
                                },
                            },
                        },
                    },
                });

                saveCustomProperties({ projectId: sceneId, data: updated.customProperties });
            } else {
                saveCustomProperties({
                    projectId: sceneId,
                    data: {
                        ...originalScene.customProperties,
                        properties: {
                            stampSettings: {
                                ...settings,
                                properties: originalScene.customProperties.properties?.stampSettings?.properties ?? [],
                            },
                            starred: starredArr,
                        },
                    },
                });
            }

            setSaveStatus(AsyncStatus.Success);
        } catch {
            setSaveStatus(AsyncStatus.Error);
            console.warn("Failed to save starred properties.");
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
                        {t("back")}
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
                                {t("enabled")}
                            </Box>
                        }
                    />
                    <Button disabled={saveStatus !== AsyncStatus.Initial} onClick={handleSave} color="grey">
                        <Save sx={{ mr: 1 }} />
                        {t("save")}
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
                    {t("add")}
                </Button>
            </Box>
            <ScrollBox pb={3}>
                <Typography px={1} fontWeight={600}>
                    {t("starredProperties")}
                </Typography>
                <Divider sx={{ mt: 1 }} />
                {!starredArr.length ? (
                    <Typography p={1}>{t("noPropertiesStarred")}</Typography>
                ) : (
                    <List dense disablePadding>
                        {starredArr.map((property) => (
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
                                <IconButton size="small" onClick={() => dispatch(propertiesActions.unStar(property))}>
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
