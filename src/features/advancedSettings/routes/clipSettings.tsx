import { ArrowBack, Save } from "@mui/icons-material";
import { Box, Button, Typography, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox, TextField } from "components";
import { renderActions, selectBreakingPointAngleThreshold } from "features/render";

export function ClippingSettings({ save, saving }: { save: () => Promise<void>; saving: boolean }) {
    const history = useHistory();
    const theme = useTheme();
    const { t } = useTranslation();

    const threshold = useAppSelector(selectBreakingPointAngleThreshold);
    const dispatch = useAppDispatch();

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => history.goBack()} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                    <Button sx={{ ml: "auto" }} onClick={() => save()} color="grey" disabled={saving}>
                        <Save sx={{ mr: 1 }} />
                        {t("save")}
                    </Button>
                </Box>
            </Box>
            {saving ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox height={1} px={1} mt={1} pb={3}>
                <Typography pt={1} variant="h6" fontWeight={600}>
                    {t("clipSettings")}
                </Typography>
                <Divider sx={{ my: 1, mb: 2 }} />
                <TextField
                    id="clipping-breaking-point-threshold"
                    sx={{ mb: 2 }}
                    fullWidth
                    size="small"
                    label={t("breakingPointThreshold")}
                    value={threshold}
                    onChange={({ target: { value } }) => {
                        let degree = Number(value);
                        if (degree < 0) {
                            degree = 0;
                        }
                        if (degree > 180) {
                            degree = 180;
                        }
                        dispatch(renderActions.setBreakingPointAngleThreshold(degree));
                    }}
                />
            </ScrollBox>
        </>
    );
}
