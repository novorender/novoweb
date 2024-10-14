import { Box } from "@mui/material";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { HudPanel } from "components/hudPanel";

const GlobalSearchDropdown = lazy(() => import("./globalSearchDropdown"));

export function GlobalSearch() {
    const { t } = useTranslation();
    const [show, setShow] = useState(false);

    const hide = useCallback(() => {
        setShow(false);
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!show && (e.ctrlKey || e.metaKey) && e.code === "KeyK") {
                setShow(true);
            }
            if (show && e.code === "Escape") {
                hide();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [show, hide]);

    if (!show) {
        return null;
    }

    return (
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
                    hide();
                }
            }}
        >
            <HudPanel sx={{ width: "70%", maxWidth: "800px", p: 2, mt: "-20%" }}>
                <Suspense fallback={t("loading")}>
                    <GlobalSearchDropdown onSelect={hide} />
                </Suspense>
            </HudPanel>
        </Box>
    );
}
