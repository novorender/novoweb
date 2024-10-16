import { Box, Button, Modal, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import ConsentIcon from "media/icons/consent.svg?react";
import { explorerActions, selectOrganization, selectRequireConsent } from "slices/explorer";

export function Consent() {
    const { t } = useTranslation();
    const theme = useTheme();
    const organization = useAppSelector(selectOrganization);
    const requireConsent = useAppSelector(selectRequireConsent);
    const dispatch = useAppDispatch();

    return (
        <Modal open={Boolean(requireConsent)}>
            <Box display="flex" justifyContent="center" alignItems="center" width={1} height={1}>
                <Box
                    maxWidth={430}
                    borderRadius="4px"
                    bgcolor={theme.palette.common.white}
                    py={8}
                    px={{ xs: 2, sm: 8 }}
                    mx="auto"
                >
                    <Box display="flex" mb={3} alignItems="center" justifyContent="center">
                        <ConsentIcon />
                    </Box>
                    <Typography mb={1} fontSize={24} fontWeight={700} textAlign="center" component="h1">
                        {t("consentToUse")}
                    </Typography>
                    <Typography mb={3} textAlign="center">
                        {t("consentMessage", { organization })}
                    </Typography>
                    <Button
                        fullWidth
                        size="large"
                        variant="contained"
                        onClick={() => dispatch(explorerActions.setRequireConsent(false))}
                    >
                        {t("agree")}
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
}
