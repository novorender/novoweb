import { CloudUpload, Save } from "@mui/icons-material";
import { Box, Button, Divider, LinearProgress, styled, useTheme } from "@mui/material";
import { mergeRecursive } from "@novorender/api";
import Papa from "papaparse";
import { ChangeEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useSaveCustomPropertiesMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { renderActions, selectPoints, selectTerrain } from "features/render";
import { loadScene } from "features/render/utils";
import { useSceneId } from "hooks/useSceneId";
import { AsyncStatus, RecursivePartial } from "types/misc";
import { CustomProperties } from "types/project";

import { selectPointVisualizationOriginalState } from "../selectors";
import { pointVisualizationActions } from "../slice";

export function Header() {
    const theme = useTheme();
    const { t } = useTranslation();
    const history = useHistory();
    const kind = useAppSelector(selectPoints).defaultPointVisualization.kind;
    const dispatch = useAppDispatch();
    const sceneId = useSceneId();
    const points = useAppSelector(selectPoints);
    const terrain = useAppSelector(selectTerrain);
    const originalState = useAppSelector(selectPointVisualizationOriginalState);
    const [status, setStatus] = useState(AsyncStatus.Initial);
    const [saveCustomProperties] = useSaveCustomPropertiesMutation();
    const saving = status === AsyncStatus.Loading;

    const save = async () => {
        setStatus(AsyncStatus.Loading);

        try {
            const [originalScene] = await loadScene(sceneId);

            const explorerProjectState: RecursivePartial<CustomProperties["explorerProjectState"]> = {
                renderSettings: {
                    points,
                    terrain,
                },
            };

            const updated = mergeRecursive(originalScene, {
                url: sceneId,
                customProperties: {
                    explorerProjectState,
                },
            });

            await saveCustomProperties({ projectId: sceneId, data: updated.customProperties }).unwrap();

            dispatch(pointVisualizationActions.setOriginalState(undefined));

            return setStatus(AsyncStatus.Success);
        } catch (e) {
            console.warn(e);
            return setStatus(AsyncStatus.Error);
        }
    };

    const importCsv = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        const reader = new FileReader();
        reader.readAsText(file, "UTF-8");
        reader.onload = (evt) => {
            const text = evt.target?.result as string;
            if (!text) {
                return;
            }
            const csv = Papa.parse(text as string);
            history.push("/import-csv", { csv, kind });
        };
        reader.onerror = function (evt) {
            console.error(evt);
        };
    };

    const cancel = () => {
        if (originalState) {
            dispatch(
                renderActions.setPoints({
                    classificationColorGradient: structuredClone(originalState.classificationColorGradient),
                    defaultPointVisualization: originalState.defaultPointVisualization,
                }),
            );
            dispatch(
                renderActions.setTerrain({
                    elevationGradient: structuredClone(originalState.elevationGradient),
                }),
            );
            dispatch(pointVisualizationActions.setOriginalState(undefined));
        }
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="flex-end">
                    {(kind === "classification" || kind === "elevation") && (
                        <Button component="label" color="grey" tabIndex={-1} startIcon={<CloudUpload />}>
                            {t("import")}
                            <VisuallyHiddenInput type="file" onChange={importCsv} accept=".csv" />
                        </Button>
                    )}
                    <Button onClick={save} color="grey" disabled={saving}>
                        <Save sx={{ mr: 1 }} />
                        {t("save")}
                    </Button>
                    <Button onClick={cancel} variant="text" color="secondary">
                        {t("cancel")}
                    </Button>
                </Box>
            </Box>

            {saving ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
        </>
    );
}

const VisuallyHiddenInput = styled("input")({
    clip: "rect(0 0 0 0)",
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    whiteSpace: "nowrap",
    width: 1,
});
