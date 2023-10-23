import { GppMaybe } from "@mui/icons-material";
import { Box, Button, Modal, Typography, useTheme } from "@mui/material";

import { msalInstance } from "app";
import { useAppSelector } from "app/store";
import { ScrollBox } from "components";
import { loginRequest } from "config/auth";
import { selectMsalAccount, selectMsalInteractionRequired } from "slices/authSlice";

export function MsalInteraction() {
    const theme = useTheme();
    const msalInteractionRequired = useAppSelector(selectMsalInteractionRequired);
    const msalAccount = useAppSelector(selectMsalAccount);

    const handleRedirect = () => {
        msalInstance.acquireTokenRedirect({
            ...loginRequest,
            sid: msalAccount?.idTokenClaims?.sid,
            loginHint: msalAccount?.idTokenClaims?.login_hint,
            account: msalAccount ?? undefined,
            authority: msalAccount?.tenantId
                ? `https://login.microsoftonline.com/${msalAccount.tenantId}`
                : loginRequest.authority,
        });
    };

    return (
        <Modal open={Boolean(msalInteractionRequired)}>
            <Box display="flex" justifyContent="center" alignItems="center" width={1} height={1}>
                <ScrollBox
                    maxWidth={430}
                    maxHeight={1}
                    borderRadius="4px"
                    bgcolor={theme.palette.common.white}
                    py={8}
                    px={{ xs: 2, sm: 8 }}
                    mx="auto"
                >
                    <Box
                        display="flex"
                        mb={3}
                        mx="auto"
                        alignItems="center"
                        justifyContent="center"
                        height={140}
                        width={140}
                        borderRadius={"50%"}
                        bgcolor="rgba(214, 30, 92, 0.06)"
                        fontSize={70}
                    >
                        <GppMaybe fontSize={"inherit"} />
                    </Box>
                    <Typography mb={1} fontSize={24} fontWeight={700} textAlign="center" component="h1">
                        Interaction required
                    </Typography>
                    <Typography mb={2}>
                        Re-authentication through Microsoft Active Directory could not be completed in the background
                        because it requires user interaction.
                    </Typography>
                    <Typography mb={3}>
                        Allow Novorender to open popups in your browser's settings before refreshing this page or click
                        the button below to get sent to Microsoft AD to complete the authentication.
                    </Typography>
                    <Box>
                        <Button fullWidth size="large" variant="contained" onClick={handleRedirect}>
                            Redirect to Active Directory
                        </Button>
                    </Box>
                </ScrollBox>
            </Box>
        </Modal>
    );
}
