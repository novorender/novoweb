import { ArrowBack, Save } from "@mui/icons-material";
import { Box, Button, Divider, FormControlLabel, useTheme } from "@mui/material";
import { MouseEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useSaveCustomPropertiesMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { IosSwitch, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { formsActions, selectAlwaysShowMarkers } from "features/forms/slice";
import { loadScene } from "features/render/utils";
import { useSceneId } from "hooks/useSceneId";
import { selectIsAdminScene } from "slices/explorer/selectors";
import { AsyncStatus } from "types/misc";
import { mergeRecursive } from "utils/misc";

export function Settings() {
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();
    const sceneId = useSceneId();
    const isAdminScene = useAppSelector(selectIsAdminScene);
    const alwaysShowMarkers = useAppSelector(selectAlwaysShowMarkers);
    const [saveCustomProperties] = useSaveCustomPropertiesMutation();

    const [saveStatus, setSaveStatus] = useState(AsyncStatus.Initial);

    const handleSave = async (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setSaveStatus(AsyncStatus.Loading);
        try {
            const [originalScene] = await loadScene(sceneId);

            const updated = mergeRecursive(originalScene, {
                url: isAdminScene ? scene.id : `${sceneId}:${scene.id}`,
                customProperties: {
                    forms: {
                        alwaysShowMarkers,
                    },
                },
            });

            await saveCustomProperties({ projectId: sceneId, data: updated.customProperties }).unwrap();
            setSaveStatus(AsyncStatus.Success);
        } catch {
            console.warn("Failed to save Forms settings");
            setSaveStatus(AsyncStatus.Error);
        }
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box m={1} display="flex" justifyContent="space-between">
                    <Button onClick={() => history.goBack()} color="inherit">
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                    <Button disabled={saveStatus === AsyncStatus.Loading} onClick={handleSave} color="inherit">
                        <Save sx={{ mr: 1 }} />
                        {t("save")}
                    </Button>
                </Box>
            </Box>
            {saveStatus === AsyncStatus.Loading && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}
            <ScrollBox pt={2} pb={3}>
                <FormControlLabel
                    control={
                        <IosSwitch
                            size="medium"
                            color="primary"
                            checked={alwaysShowMarkers}
                            onChange={() => dispatch(formsActions.toggleAlwaysShowMarkers())}
                        />
                    }
                    label={<Box fontSize={14}>{t("showMarkersWhenComponentIsClosed")}</Box>}
                    sx={{ ml: 1 }}
                />
            </ScrollBox>
        </>
    );
}
