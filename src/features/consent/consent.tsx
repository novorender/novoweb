import { Box, Button, Modal, Typography, useTheme } from "@mui/material";
import { useAppDispatch, useAppSelector } from "app/store";

import { explorerActions, selectRequireConsent } from "slices/explorerSlice";

import { ReactComponent as ConsentIcon } from "media/icons/consent.svg";

export function Consent() {
    const theme = useTheme();
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
                        Consent to use
                    </Typography>
                    <Typography mb={3} textAlign="center">
                        This 3D is the property of {requireConsent} and must neither be used, reproduced nor handed over
                        to any third party without written consent.
                    </Typography>
                    <Button
                        fullWidth
                        size="large"
                        variant="contained"
                        onClick={() => dispatch(explorerActions.setRequireConsent(""))}
                    >
                        Agree
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
}
