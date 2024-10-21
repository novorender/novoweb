import { Box } from "@mui/material";
import { lazy, Suspense, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "app/redux-store-interactions";
import { HudPanel } from "components/hudPanel";
import { featuresConfig } from "config/features";
import { useOpenWidget } from "hooks/useOpenWidget";
import { useRemoveWidget } from "hooks/useRemoveWidget";
import { selectGlobalSearchOpen } from "slices/explorer";

const GlobalSearchDropdown = lazy(() => import("./globalSearchDropdown"));

export function GlobalSearch() {
    const { t } = useTranslation();
    const show = useAppSelector(selectGlobalSearchOpen);
    const openWidget = useOpenWidget();
    const removeWidget = useRemoveWidget();

    const hide = useCallback(
        (reason: "used" | "discarded") => {
            removeWidget(featuresConfig.globalSearch.key, { reason });
        },
        [removeWidget],
    );

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!show && (e.ctrlKey || e.metaKey) && e.code === "KeyK") {
                // Close any open popup overlay, because it conflicts with search input focus
                const overlay = document.querySelector(
                    "body > .MuiPopover-root.MuiMenu-root.MuiModal-root .MuiBackdrop-root.MuiModal-backdrop",
                ) as HTMLElement;

                if (overlay) {
                    overlay?.click();
                    // Wait a bit before opening the widget so autofocus could kick in
                    setTimeout(() => {
                        openWidget(featuresConfig.globalSearch.key);
                    }, 200);
                } else {
                    openWidget(featuresConfig.globalSearch.key);
                }
            } else if (show && e.code === "Escape") {
                hide("discarded");
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [openWidget, show, hide]);

    if (!show) {
        return null;
    }

    return createPortal(
        <Box
            sx={{
                position: "absolute",
                inset: 0,
                display: "grid",
                placeItems: "center",
                background: "rgba(0, 0, 0, 0.4)",
                zIndex: 2000,
            }}
            id="global-search-overlay"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    hide("discarded");
                }
            }}
        >
            <HudPanel sx={{ width: "70%", maxWidth: "800px", p: 2, mt: "-20%" }}>
                <Suspense fallback={t("loading")}>
                    <GlobalSearchDropdown onSelect={() => hide("used")} />
                </Suspense>
            </HudPanel>
        </Box>,
        document.body,
    );
}
