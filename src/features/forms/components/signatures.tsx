import { AccessTime, Create, Person } from "@mui/icons-material";
import { Box, List, ListItem, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { Accordion, AccordionDetails, AccordionSummary } from "components";
import { type Signature } from "features/forms/types";

interface SignaturesProps {
    signatures?: Signature[];
}

export function Signatures({ signatures }: SignaturesProps) {
    const { t } = useTranslation();
    return (
        signatures && (
            <Accordion>
                <AccordionSummary>{t("signatures", { length: signatures.length })}</AccordionSummary>
                <AccordionDetails>
                    <List>
                        {signatures.map((signature, index) => (
                            <Signature
                                key={signature.timestamp}
                                signature={signature}
                                showDivider={index !== signatures.length - 1}
                            />
                        ))}
                    </List>
                </AccordionDetails>
            </Accordion>
        )
    );
}

interface SignatureProps {
    signature: Signature;
    showDivider?: boolean;
}

export function Signature({ signature, showDivider }: SignatureProps) {
    const { t } = useTranslation();
    const { isFinal, userLogin = t("n/a"), userName = t("unknownUser"), timestamp } = signature;
    const localDateTime = useMemo(
        () => (timestamp && new Date(timestamp).toLocaleString()) || t("n/a"),
        [timestamp, t],
    );
    return (
        <ListItem divider={showDivider}>
            <ListItemIcon>{isFinal ? <Create color="primary" /> : <Create />}</ListItemIcon>
            <ListItemText
                primary={
                    <Typography variant="subtitle1">
                        {userName}
                        {isFinal && (
                            <Typography component="span" variant="caption" color="primary" sx={{ ml: 1 }}>
                                ({t("final")})
                            </Typography>
                        )}
                    </Typography>
                }
                secondary={
                    <>
                        <Box display="flex" alignItems="center" mt={0.5}>
                            <Person fontSize="small" sx={{ mr: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                                {userLogin}
                            </Typography>
                        </Box>
                        <Box display="flex" alignItems="center" mt={0.5}>
                            <AccessTime fontSize="small" sx={{ mr: 1 }} />
                            <Typography variant="body2" color="text.secondary">
                                {localDateTime}
                            </Typography>
                        </Box>
                    </>
                }
            />
        </ListItem>
    );
}
