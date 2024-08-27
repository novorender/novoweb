import { Close, DeleteSweep, OpenInNew } from "@mui/icons-material";
import { Box, Button, IconButton, List, Snackbar, snackbarContentClasses } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useGetPropertyTreeFavoritesQuery } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    LinearProgress,
    LogoSpeedDial,
    ScrollBox,
    WidgetContainer,
    WidgetHeader,
} from "components";
import { featuresConfig } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useAbortController } from "hooks/useAbortController";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";
import { explorerActions, selectMaximized, selectMinimized, selectProjectIsV2 } from "slices/explorer";
import { AsyncStatus } from "types/misc";
import { secondsToMs } from "utils/time";

import { InternalNode } from "./internalNode";
import { RootNode } from "./rootNode";
import { propertyTreeActions, selectIsPropertyTreeLoading, selectPropertyTreeBookmarkState } from "./slice";

export default function PropertyTree() {
    const { t } = useTranslation();
    const [menuOpen, toggleMenu] = useToggle();
    const sceneId = useSceneId();
    const minimized = useAppSelector(selectMinimized) === featuresConfig.propertyTree.key;
    const maximized = useAppSelector(selectMaximized).includes(featuresConfig.propertyTree.key);

    const dispatch = useAppDispatch();
    const isV2 = useAppSelector(selectProjectIsV2);
    const isLoading = useAppSelector(selectIsPropertyTreeLoading);
    const activeGroups = useAppSelector(selectPropertyTreeBookmarkState);
    const groupsCreationStatus = useAppSelector((state) => state.propertyTree.groupsCreationStatus);

    const { data: favorites = [], isLoading: isLoadingFavorites } = useGetPropertyTreeFavoritesQuery(
        { projectId: sceneId },
        { skip: !isV2 },
    );

    const favoritesInitialized = useRef(false);
    const [favoritesExpanded, toggleExpandFavorites] = useToggle(favorites.length > 0);

    const [abortController, abort] = useAbortController();

    const slowLoadingTimeoutId = useRef(0);
    const [slowLoading, setSlowLoading] = useState(true);

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

    const canClear = isLoading || Boolean(activeGroups?.groups.length);
    const clear = () => {
        if (!canClear) {
            return;
        }

        abort();
        dispatch(propertyTreeActions.resetAllGroupsStatus());
    };

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.propertyTree} disableShadow={menuOpen}>
                    {!menuOpen && !minimized && (
                        <Box display={"flex"} justifyContent={"flex-end"}>
                            <Button disabled={!canClear} onClick={clear} color="grey">
                                <DeleteSweep sx={{ mr: 1 }} />
                                {t("clear")}
                            </Button>
                        </Box>
                    )}
                </WidgetHeader>
                {isLoading && (
                    <Box position="relative">
                        <LinearProgress />
                    </Box>
                )}
                <ScrollBox display={!menuOpen && !minimized ? "block" : "none"} height={1} pt={1} pb={2}>
                    <Accordion
                        slotProps={{ transition: { timeout: 200 } }}
                        disabled={!favorites.length}
                        sx={{ mb: 1 }}
                        expanded={favoritesExpanded}
                        onChange={(_evt, expanded) => toggleExpandFavorites(expanded)}
                    >
                        <AccordionSummary>{t("favorites")}</AccordionSummary>
                        <AccordionDetails>
                            {favorites.length > 0 && (
                                <List disablePadding>
                                    {favorites.map((property) => (
                                        <InternalNode
                                            key={property}
                                            path={property}
                                            propertyName={property.split("/").at(-1) ?? property}
                                            abortController={abortController}
                                            level={1}
                                        />
                                    ))}
                                </List>
                            )}
                        </AccordionDetails>
                    </Accordion>
                    <Accordion defaultExpanded={true} slotProps={{ transition: { timeout: 200 } }}>
                        <AccordionSummary>{t("general")}</AccordionSummary>
                        <AccordionDetails>
                            <RootNode abortController={abortController} />
                        </AccordionDetails>
                    </Accordion>
                </ScrollBox>

                {[AsyncStatus.Success, AsyncStatus.Error].includes(groupsCreationStatus) && (
                    <Snackbar
                        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                        sx={{
                            width: { xs: "auto", sm: 350 },
                            bottom: { xs: "auto", sm: 24 },
                            top: { xs: 24, sm: "auto" },
                        }}
                        autoHideDuration={secondsToMs(3.5)}
                        open={true}
                        onClose={() => dispatch(propertyTreeActions.setGroupsCreationStatus(AsyncStatus.Initial))}
                        message={
                            groupsCreationStatus === AsyncStatus.Error
                                ? "An error occurred while creating groups."
                                : "Groups created! Save in groups widget."
                        }
                        action={
                            groupsCreationStatus === AsyncStatus.Error ? (
                                <IconButton
                                    size="small"
                                    aria-label="close"
                                    color="inherit"
                                    onClick={() =>
                                        dispatch(propertyTreeActions.setGroupsCreationStatus(AsyncStatus.Initial))
                                    }
                                >
                                    <Close fontSize="small" />
                                </IconButton>
                            ) : (
                                <IconButton
                                    size="small"
                                    aria-label="close"
                                    color="inherit"
                                    onClick={() => {
                                        dispatch(explorerActions.forceOpenWidget(featuresConfig.groups.key));
                                        dispatch(propertyTreeActions.setGroupsCreationStatus(AsyncStatus.Initial));
                                    }}
                                >
                                    <OpenInNew fontSize="small" />
                                </IconButton>
                            )
                        }
                    />
                )}

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
                        message={"This is a very big search. Please be patient while we build your filter."}
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
                {menuOpen && <WidgetList widgetKey={featuresConfig.propertyTree.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} ariaLabel="toggle widget menu" />
        </>
    );
}
