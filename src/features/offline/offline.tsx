import { Delete, Sync } from "@mui/icons-material";
import { Box, Button, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Divider,
    LinearProgress,
    LogoSpeedDial,
    ScrollBox,
    WidgetContainer,
    WidgetHeader,
} from "components";
import { featuresConfig } from "config/features";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import WidgetList from "features/widgetList/widgetList";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";
import { selectIsOnline, selectMaximized, selectMinimized } from "slices/explorer";
import { capitalize, formatFileSizeMetric } from "utils/misc";

import { offlineActions, selectOfflineAction, selectOfflineScenes, selectSizeWarning } from "./offlineSlice";

export default function Offline() {
    const {
        state: { view, offlineWorkerState },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const parentSceneId = view.renderState.scene!.config.id;
    const viewerSceneId = useSceneId();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.offline.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.offline.key);
    const action = useAppSelector(selectOfflineAction);
    const currentParentScene = useAppSelector(selectOfflineScenes)[parentSceneId];
    const currentViewerScene = currentParentScene?.viewerScenes.find((scene) => scene.id === viewerSceneId);
    const sizeWarning = useAppSelector(selectSizeWarning);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.offline} disableShadow={menuOpen} />
                {action && (
                    <Box position="relative">
                        <LinearProgress />
                    </Box>
                )}
                {!menuOpen &&
                    !minimized &&
                    (!offlineWorkerState ? (
                        <Typography p={1}>{t("offlineNotAvailable")}</Typography>
                    ) : (
                        <ScrollBox p={1} pt={2}>
                            {sizeWarning ? (
                                <ConfirmSync {...sizeWarning} />
                            ) : !currentParentScene ||
                              (!currentViewerScene && currentParentScene.id !== viewerSceneId) ? (
                                <Pending />
                            ) : (
                                <>
                                    {currentParentScene.status === "incremental" && <Incremental />}
                                    {currentParentScene.status === "synchronized" && <Downloaded />}
                                    {currentParentScene.status === "scanning" && (
                                        <Scanning progress={currentParentScene.scanProgress} />
                                    )}
                                    {currentParentScene.status === "synchronizing" && (
                                        <Downloading progress={currentParentScene.progress} />
                                    )}
                                    {currentParentScene.status === "error" && (
                                        <DownloadError error={currentParentScene.error} />
                                    )}
                                    {currentParentScene.status === "aborted" && <Interrupted />}
                                    {currentParentScene.status === "invalid format" && <OlderFormat />}
                                </>
                            )}

                            <AllDownloadedScenes
                                synchronizing={currentParentScene && currentParentScene.status === "synchronizing"}
                            />
                        </ScrollBox>
                    ))}
                {menuOpen && <WidgetList widgetKey={featuresConfig.offline.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}

function Scanning({ progress }: { progress: string }) {
    const { t } = useTranslation();
    const action = useAppSelector(selectOfflineAction);
    const dispatch = useAppDispatch();
    return (
        <>
            <Box position="relative" mx={-1} mt={-2} mb={1}>
                <LinearProgress />
            </Box>
            <Box>
                {t("scanningScene")}
                {progress ? t("filesScanned", { progress }) : ""}
                <Button
                    sx={{ ml: 2 }}
                    disabled={action !== undefined}
                    color="grey"
                    onClick={() => dispatch(offlineActions.setAction({ action: "pause" }))}
                >
                    {t("pause")}
                </Button>
            </Box>
        </>
    );
}

function Downloading({ progress }: { progress: string }) {
    const { t } = useTranslation();
    const action = useAppSelector(selectOfflineAction);
    const dispatch = useAppDispatch();
    return (
        <>
            <Box position="relative" mx={-1} mt={-2} mb={1}>
                <LinearProgress />
            </Box>
            <Box>
                {t("downloadingScene")}
                {progress ? `${progress}%` : ""}
                <Button
                    sx={{ ml: 2 }}
                    disabled={action !== undefined}
                    color="grey"
                    onClick={() => dispatch(offlineActions.setAction({ action: "pause" }))}
                >
                    {t("pause")}
                </Button>
            </Box>
        </>
    );
}

function Interrupted() {
    const { t } = useTranslation();
    const action = useAppSelector(selectOfflineAction);
    const isOnline = useAppSelector(selectIsOnline);
    const dispatch = useAppDispatch();
    return (
        <>
            <Box>{t("downloadInterrupted")}</Box>
            <Box display="flex" justifyContent="flex-end" mt={1}>
                <Button
                    disabled={action !== undefined || !isOnline}
                    variant="contained"
                    onClick={() => dispatch(offlineActions.setAction({ action: "fullSync" }))}
                >
                    {t("resume")}
                </Button>
            </Box>
        </>
    );
}

function DownloadError({ error }: { error?: string }) {
    const { t } = useTranslation();
    const action = useAppSelector(selectOfflineAction);
    const isOnline = useAppSelector(selectIsOnline);
    const dispatch = useAppDispatch();
    return (
        <>
            {error ?? "This scene cannot be downloaded, please contact support."}
            <br />
            <Box display="flex" justifyContent="flex-end" mt={1}>
                <Button
                    disabled={action !== undefined || !isOnline}
                    variant="contained"
                    onClick={() => dispatch(offlineActions.setAction({ action: "fullSync" }))}
                >
                    {t("tryAgain")}
                </Button>
            </Box>
        </>
    );
}

function OlderFormat() {
    const { t } = useTranslation();
    return (
        <>
            {t("nonDownloadableScene")}
            <br />
        </>
    );
}

function Pending() {
    const {
        state: { offlineWorkerState },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const action = useAppSelector(selectOfflineAction);
    const dispatch = useAppDispatch();

    return (
        <>
            {t("notOfflineScene")}
            <br />
            {offlineWorkerState.initialStorageEstimate?.quota !== undefined &&
                offlineWorkerState.initialStorageEstimate?.usage !== undefined && (
                    <>
                        {t("estimatedAvailableSpace")}{" "}
                        {formatFileSizeMetric(
                            Math.max(
                                0,
                                offlineWorkerState.initialStorageEstimate.quota -
                                    offlineWorkerState.initialStorageEstimate.usage,
                            ),
                        )}
                        <br />
                    </>
                )}
            <Box display="flex" justifyContent={"space-between"}>
                <Button
                    sx={{ my: 2 }}
                    disabled={action !== undefined}
                    onClick={() => dispatch(offlineActions.setAction({ action: "estimate" }))}
                >
                    {t("fullDownload")}
                </Button>
                <Button
                    sx={{ my: 2 }}
                    variant="contained"
                    disabled={action !== undefined}
                    onClick={() => dispatch(offlineActions.setAction({ action: "incrementalSync" }))}
                >
                    {t("incremental")}
                </Button>
            </Box>
        </>
    );
}

function Downloaded() {
    const { t } = useTranslation();
    return (
        <>
            {t("offlineScene")}
            <br />
        </>
    );
}

function Incremental() {
    const { t } = useTranslation();
    return (
        <>
            {t("sceneDownloaded")}
            <br />
        </>
    );
}

function ConfirmSync({
    totalSize,
    usedSize,
    availableSize,
}: {
    totalSize: number;
    usedSize: number;
    availableSize: number;
}) {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const isOnline = useAppSelector(selectIsOnline);
    const requiredSize = Math.max(0, totalSize - usedSize);

    return (
        <>
            {t("sceneSyncMessage", {
                requiredSize: formatFileSizeMetric(requiredSize),
                availableSize: formatFileSizeMetric(availableSize),
            })}
            <br />
            {t("processLikelyFail")}
            <br />
            {t("proceedDownloadingScene")}
            <Box display="flex" justifyContent="flex-end" mt={1} gap={1}>
                <Button
                    disabled={!isOnline}
                    variant="contained"
                    onClick={() => {
                        dispatch(offlineActions.setSizeWarning(undefined));
                        dispatch(offlineActions.setAction({ action: "fullSync" }));
                    }}
                >
                    {t("yes")}
                </Button>
                <Button
                    disabled={!isOnline}
                    onClick={() => {
                        dispatch(offlineActions.setSizeWarning(undefined));
                    }}
                >
                    {t("no")}
                </Button>
            </Box>
        </>
    );
}

function AllDownloadedScenes({ synchronizing }: { synchronizing: boolean }) {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const scenes = useAppSelector(selectOfflineScenes);
    const isOnline = useAppSelector(selectIsOnline);
    const dispatch = useAppDispatch();
    const viewerSceneId = useSceneId();

    return (
        <>
            <Typography mt={2} fontWeight={600}>
                {t("cachedScenes")}
            </Typography>
            <Divider />
            {Object.values(scenes)
                .sort((scene) => (scene.id === view.renderState.scene?.config.id ? -1 : 0))
                .map((scene) => {
                    const isCurrent = scene.id === view.renderState.scene?.config.id;
                    return (
                        <Accordion key={scene.id} defaultExpanded={isCurrent}>
                            <AccordionSummary>
                                {scene.id.slice(0, 8)}
                                ...
                                {isCurrent ? `(${t("current")})` : ""}
                            </AccordionSummary>
                            <AccordionDetails sx={{ px: 1 }}>
                                <Typography>
                                    {t("id")}
                                    {scene.id}
                                </Typography>
                                <Typography>
                                    {t("size")}
                                    {scene.size ? formatFileSizeMetric(scene.size) : t("unknown")}
                                </Typography>
                                <Typography>
                                    {t("statusName")}
                                    {capitalize(scene.status)}
                                </Typography>
                                <Typography>
                                    {t("lastSynchronized", {
                                        date: scene.lastSync ? new Date(scene.lastSync).toLocaleString() : t("unknown"),
                                    })}
                                </Typography>
                                {isCurrent && (
                                    <Box
                                        sx={{
                                            my: 2,
                                            display: "flex",
                                            justifyContent: "flex-end",
                                        }}
                                    >
                                        <Button
                                            size="small"
                                            variant="contained"
                                            disabled={!isOnline || synchronizing}
                                            onClick={() => dispatch(offlineActions.setAction({ action: "readSize" }))}
                                        >
                                            <Sync fontSize="small" sx={{ mr: 1 }} />
                                            {t("updateSize")}
                                        </Button>
                                    </Box>
                                )}
                                <Typography mt={2} fontWeight={600}>
                                    {t("viewerScenes")}
                                </Typography>
                                {[...scene.viewerScenes]
                                    .sort((vs) => {
                                        return vs.id === viewerSceneId ? -1 : 0;
                                    })
                                    .map((viewerScene) => {
                                        const isCurrentViewerScene = viewerScene.id === viewerSceneId;
                                        return (
                                            <Accordion
                                                key={viewerScene.id}
                                                level={2}
                                                defaultExpanded={isCurrentViewerScene}
                                            >
                                                <AccordionSummary level={2}>
                                                    {viewerScene.name} {isCurrentViewerScene && `(${t("current")})`}
                                                </AccordionSummary>
                                                <AccordionDetails sx={{ px: 1 }}>
                                                    <Typography>
                                                        {t("id")}
                                                        {viewerScene.id}
                                                    </Typography>
                                                    <Typography>
                                                        {t("lastSynchronized", {
                                                            date: viewerScene.lastSynced
                                                                ? new Date(viewerScene.lastSynced).toLocaleString()
                                                                : t("unknown"),
                                                        })}
                                                    </Typography>
                                                </AccordionDetails>
                                                {isCurrentViewerScene && (
                                                    <Box
                                                        sx={{
                                                            my: 2,
                                                            display: "flex",
                                                            justifyContent: "flex-end",
                                                        }}
                                                    >
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            disabled={!isOnline || synchronizing}
                                                            onClick={() =>
                                                                dispatch(
                                                                    offlineActions.setAction({ action: "estimate" }),
                                                                )
                                                            }
                                                        >
                                                            <Sync fontSize="small" sx={{ mr: 1 }} /> {t("sync")}
                                                        </Button>
                                                    </Box>
                                                )}
                                            </Accordion>
                                        );
                                    })}

                                <Box
                                    sx={{
                                        my: 2,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <Button
                                        size="small"
                                        color="grey"
                                        onClick={() =>
                                            dispatch(offlineActions.setAction({ id: scene.id, action: "delete" }))
                                        }
                                    >
                                        <Delete fontSize="small" sx={{ mr: 1 }} /> {t("delete")}
                                    </Button>
                                </Box>
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
        </>
    );
}
