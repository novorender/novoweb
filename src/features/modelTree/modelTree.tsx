import { Close, DeleteSweep } from "@mui/icons-material";
import { Box, Button, FormControlLabel, IconButton, Snackbar, snackbarContentClasses } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import AutoSizer from "react-virtualized-auto-sizer";

import { useGetModelTreeFavoritesQuery } from "apis/dataV2/dataV2Api";
import { useAppSelector } from "app/redux-store-interactions";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    IosSwitch,
    LinearProgress,
    LogoSpeedDial,
    WidgetBottomScrollBox,
    WidgetContainer,
    WidgetHeader,
} from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useAbortController } from "hooks/useAbortController";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized, selectProjectIsV2 } from "slices/explorer";
import { secondsToMs } from "utils/time";

import { selectIsModelTreeLoading } from "./slice";

export default function ModelTree() {
    const { t } = useTranslation();
    const sceneId = useSceneId();
    const [menuOpen, toggleMenu] = useToggle();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.modelTree.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.modelTree.key);

    const [abortController] = useAbortController();

    const slowLoadingTimeoutId = useRef(0);
    const [slowLoading, setSlowLoading] = useState(true);

    const isV2 = useAppSelector(selectProjectIsV2);
    const isLoading = useAppSelector(selectIsModelTreeLoading);

    const { data: favorites = [], isLoading: isLoadingFavorites } = useGetModelTreeFavoritesQuery(
        { projectId: sceneId },
        { skip: !isV2 },
    );

    const favoritesInitialized = useRef(false);
    const [favoritesExpanded, toggleExpandFavorites] = useToggle(favorites.length > 0);

    const [fileLevel, setFileLevel] = useToggle();

    useEffect(() => {
        if (isLoadingFavorites || favoritesInitialized.current) {
            return;
        }

        if (favorites.length) {
            toggleExpandFavorites(true);
        }

        favoritesInitialized.current = true;
    }, [isLoadingFavorites, favorites, toggleExpandFavorites]);

    useEffect(() => {
        if (!isLoading) {
            setSlowLoading(false);
            return;
        }

        if (slowLoadingTimeoutId.current) {
            window.clearTimeout(slowLoadingTimeoutId.current);
        }

        slowLoadingTimeoutId.current = window.setTimeout(() => {
            setSlowLoading(true);
        }, secondsToMs(10));

        return () => {
            if (slowLoadingTimeoutId.current) {
                window.clearTimeout(slowLoadingTimeoutId.current);
            }
        };
    }, [isLoading]);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader menuOpen={menuOpen} toggleMenu={toggleMenu} widget={featuresConfig.modelTree}>
                    {!menuOpen && !minimized && (
                        <>
                            <Box mt={1} mb={1} display="flex" justifyContent="space-between">
                                <FormControlLabel
                                    sx={{ ml: 0 }}
                                    control={
                                        <IosSwitch
                                            checked={fileLevel}
                                            color="primary"
                                            onChange={({ target: { checked: newFileLevel } }) => {
                                                setFileLevel(newFileLevel);
                                            }}
                                        />
                                    }
                                    label={<Box>{t("fileLevel")}</Box>}
                                />
                                <Button onClick={() => {}} color="grey">
                                    <DeleteSweep sx={{ mr: 1 }} />
                                    {t("clear")}
                                </Button>
                            </Box>
                        </>
                    )}
                </WidgetHeader>
                {isLoading && (
                    <Box position="relative">
                        <LinearProgress />
                    </Box>
                )}
                <WidgetBottomScrollBox
                    display={!menuOpen && !minimized ? "flex" : "none"}
                    flexDirection="column"
                    flex={1}
                    pt={1}
                    pb={2}
                >
                    <Accordion
                        slotProps={{ transition: { timeout: 200 } }}
                        disabled={!favorites.length}
                        sx={{ mb: 1 }}
                        expanded={favoritesExpanded}
                        onChange={(_evt, expanded) => toggleExpandFavorites(expanded)}
                        square
                    >
                        <AccordionSummary>{t("favorites")}</AccordionSummary>
                        <AccordionDetails>{favorites.length > 0 && <></>}</AccordionDetails>
                    </Accordion>
                    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                        <AutoSizer>
                            {({ height, width }) => (
                                <Accordion
                                    slotProps={{ transition: { timeout: 200 } }}
                                    square
                                    defaultExpanded
                                    sx={{ height, width, display: "flex", flexDirection: "column" }}
                                >
                                    <AccordionSummary>{t("foldersAndFiles")}</AccordionSummary>
                                    <AccordionDetails sx={{ height: "100%" }}></AccordionDetails>
                                </Accordion>
                            )}
                        </AutoSizer>
                    </Box>
                </WidgetBottomScrollBox>
                {slowLoading && (
                    <Snackbar
                        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                        sx={{
                            width: { xs: "auto", sm: 350 },
                            bottom: { xs: "auto", sm: 24 },
                            top: { xs: 24, sm: "auto" },
                        }}
                        ContentProps={{
                            sx: { flexWrap: "nowrap", [`& .${snackbarContentClasses.action}`]: { pl: 1.5 } },
                        }}
                        autoHideDuration={null}
                        open={true}
                        onClose={() => setSlowLoading(false)}
                        message={t("slowSearch")}
                        action={
                            <IconButton
                                size="small"
                                aria-label="close"
                                color="inherit"
                                onClick={() => setSlowLoading(false)}
                            >
                                <Close fontSize="small" />
                            </IconButton>
                        }
                    />
                )}
                {menuOpen && <WidgetList widgetKey={featuresConfig.modelTree.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
