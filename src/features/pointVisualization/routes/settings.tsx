import { ArrowBack, Close, Save } from "@mui/icons-material";
import { Box, Button, FormControlLabel, IconButton, Snackbar, useTheme } from "@mui/material";
import { mergeRecursive } from "@novorender/api";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useSaveCustomPropertiesMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, IosSwitch, ScrollBox } from "components";
import { loadScene } from "features/render/utils";
import { useSceneId } from "hooks/useSceneId";
import { AsyncStatus } from "types/misc";

import { selectPointVisualizationStamp } from "../selectors";
import { pointVisualizationActions } from "../slice";

export function SettingsView() {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const stamp = useAppSelector(selectPointVisualizationStamp);
    const dispatch = useAppDispatch();
    const sceneId = useSceneId();
    const [saveStatus, setSaveStatus] = useState(AsyncStatus.Initial);
    const [saveCustomProperties] = useSaveCustomPropertiesMutation();

    const save = async () => {
        if (saveStatus !== AsyncStatus.Initial) {
            return;
        }

        setSaveStatus(AsyncStatus.Loading);

        try {
            const [originalScene] = await loadScene(sceneId);

            const data = mergeRecursive(originalScene?.customProperties ?? {}, {
                explorerProjectState: {
                    features: {
                        pointVisualization: {
                            stamp,
                        },
                    },
                },
            });

            saveCustomProperties({ projectId: sceneId, data });

            setSaveStatus(AsyncStatus.Success);
        } catch {
            setSaveStatus(AsyncStatus.Error);
            console.warn("Failed to save settings.");
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
                    <Button onClick={save} color="grey">
                        <Save sx={{ mr: 1 }} />
                        {t("save")}
                    </Button>
                </Box>
            </Box>
            <ScrollBox pt={2} pb={3}>
                <FormControlLabel
                    control={
                        <IosSwitch
                            size="medium"
                            color="primary"
                            checked={stamp.enabled}
                            onChange={() => dispatch(pointVisualizationActions.setStamp({ enabled: !stamp.enabled }))}
                        />
                    }
                    label={<Box fontSize={14}>{t("showStampForClassificationAndIntensityModes")}</Box>}
                    sx={{ ml: 1 }}
                />
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
                message={saveStatus === AsyncStatus.Error ? t("errorOccurred") : t("settingsSuccessfullySaved")}
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
