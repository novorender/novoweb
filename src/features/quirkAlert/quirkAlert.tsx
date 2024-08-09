import { Warning } from "@mui/icons-material";
import { Box, Button, Checkbox, FormControlLabel, Modal, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "app/redux-store-interactions";
import { selectDeviceProfile } from "features/render";
import { useToggle } from "hooks/useToggle";

const quirk = "adreno600";
const storageKey = `ignore_quirk_warning_${quirk}`;
const runCheck = !localStorage[storageKey];

export function QuirkAlert() {
    const { t } = useTranslation();
    const theme = useTheme();
    const [modalOpen, toggleModal] = useToggle(true);
    const [hideNext, toggleHideNext] = useToggle(false);
    const {
        quirks: { adreno600: quirk },
    } = useAppSelector(selectDeviceProfile);

    if (!runCheck) {
        return null;
    }

    const handleSubmit = () => {
        if (hideNext) {
            localStorage[storageKey] = true;
        }
        toggleModal();
    };

    if (!quirk) {
        return null;
    }

    return (
        <Modal open={modalOpen}>
            <Box display="flex" justifyContent="center" alignItems="center" width={1} height={1}>
                <Box
                    maxWidth={430}
                    borderRadius="4px"
                    bgcolor={theme.palette.common.white}
                    py={8}
                    px={{ xs: 2, sm: 8 }}
                    mx="auto"
                >
                    <Box display="flex" mb={3} fontSize={40} alignItems="center" justifyContent="center">
                        <Warning color="primary" fontSize={"inherit"} />
                    </Box>
                    <Typography mb={1} fontSize={24} fontWeight={700} textAlign="center" component="h1">
                        {t("unstableGPU(Adreno600)")}
                    </Typography>
                    <Typography mb={2}>
                        {t(
                            "itLooksLikeYourDeviceIsRunningOnAnAdreno600.ThisMayResultInUnexpectedBehaviourWhileUsingCertainNovorenderFeaturesSuchAsClippingPlanesAndToonOutlines.",
                        )}
                        <br />
                        {t("pleaseGetInTouchWithSupportIfYouNoticeAnyIssues.")}
                    </Typography>
                    <FormControlLabel
                        sx={{ mb: 2 }}
                        control={
                            <Checkbox
                                size="small"
                                color="primary"
                                checked={hideNext}
                                onChange={() => toggleHideNext()}
                            />
                        }
                        label={
                            <Box mr={0.5} sx={{ userSelect: "none" }}>
                                {t("don'TShowAgain")}
                            </Box>
                        }
                    />
                    <Button fullWidth size="large" variant="contained" onClick={handleSubmit}>
                        {t("iUnderstand")}
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
}
