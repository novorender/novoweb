import { ArrowBack } from "@mui/icons-material";
import { Box, Button, Divider, FormControlLabel, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { IosSwitch, ScrollBox } from "components";
import { formsActions, selectAlwaysShowMarkers } from "features/forms/slice";

export function Settings() {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const alwaysShowMarkers = useAppSelector(selectAlwaysShowMarkers);
    const dispatch = useAppDispatch();

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box m={1} display="flex" justifyContent="space-between">
                    <Button onClick={() => history.goBack()} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                </Box>
            </Box>
            <ScrollBox pt={2} pb={3}>
                <FormControlLabel
                    control={
                        <IosSwitch
                            size="medium"
                            color="primary"
                            checked={alwaysShowMarkers}
                            onChange={() => dispatch(formsActions.toggleAlwaysShowMarkers())}
                        />
                    }
                    label={<Box fontSize={14}>{t("showMarkersWhenComponentIsClosed")}</Box>}
                    sx={{ ml: 1 }}
                />
            </ScrollBox>
        </>
    );
}
