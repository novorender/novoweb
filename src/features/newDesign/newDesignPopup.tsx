import { Box, Button, Typography } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { HudPanel } from "components/hudPanel";

import { useToggleNewDesign } from "./useToggleNewDesign";

const LocalStorageKey = "newDesignAccepted";

export function NewDesignPopup() {
    const toggleNewDesign = useToggleNewDesign();
    const [accepted, setAccepted] = useState(localStorage.getItem(LocalStorageKey) === "true");
    const { t } = useTranslation();

    if (accepted) {
        return null;
    }

    const accept = () => {
        setAccepted(true);
        localStorage.setItem(LocalStorageKey, "true");
    };

    return (
        <>
            <Box
                sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "rgba(0, 0, 0, 0.5)",
                    zIndex: 1060,
                }}
            ></Box>
            <Box
                sx={{
                    position: "absolute",
                    pointerEvents: "none",
                    left: 0,
                    top: 0,
                    width: "100%",
                    height: "100%",
                    display: "grid",
                    placeItems: "center",
                    zIndex: 1061,
                }}
            >
                <HudPanel
                    sx={{
                        pointerEvents: "auto",
                        p: 2,
                    }}
                >
                    <Typography fontWeight={600} mb={2} fontSize={20}>
                        {t("newDesign")}
                    </Typography>
                    <Typography>{t("weveChangedTheUx")}</Typography>
                    <Typography>
                        {t("youCan") + " "}
                        <Button variant="text" onClick={toggleNewDesign}>
                            {t("toggleLc")}
                        </Button>{" "}
                        {t("betweenOldAndNewDesignForNowHere")}
                        <br />
                        {t("orAnytimeIn")} <strong>{t("betaFlagPath")}</strong>.
                    </Typography>
                    <Box display="flex" justifyContent="center" mt={2}>
                        <Button variant="outlined" onClick={accept}>
                            {t("gotIt")}
                        </Button>
                    </Box>
                </HudPanel>
            </Box>
        </>
    );
}
