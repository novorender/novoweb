import { PostAdd } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppSelector } from "app/redux-store-interactions";
import { Divider } from "components";

import { selectOmega365Config, selectOmegaObjectId, selectSelectedViewId } from "../selectors";

export function ViewHeader() {
    const theme = useTheme();
    const { t } = useTranslation();
    const objectId = useAppSelector(selectOmegaObjectId);
    const views = useAppSelector(selectOmega365Config)?.views;
    const selectedViewId = useAppSelector(selectSelectedViewId);
    const view = views?.find((v) => v.id === selectedViewId);
    const history = useHistory();

    if (!view) {
        return null;
    }

    // Custom per-customer content that feels too specific at the moment
    // to make a generic approach for it
    let content: ReactNode;
    if (view.viewOrResourceName === "aviw_FOB_EksportAktiviteter") {
        content = (
            <Button onClick={() => history.push("/create-activity", { objectId })} color="grey">
                <PostAdd fontSize="small" sx={{ mr: 1 }} />
                {t("createActivity")}
            </Button>
        );
    } else if (view.viewOrResourceName === "aviw_NyeVeier_EksportObjektDokumentLink") {
        const href = objectId ? `https://nyeveier.omega365.com/nt/objects/objectdetails?ID=${objectId}` : null;

        content = (
            <Button href={href ?? ""} target="_blank" color="grey" disabled={!href}>
                {t("objectDetails")}
            </Button>
        );
    }

    if (!content) {
        return null;
    }

    return (
        <Box boxShadow={theme.customShadows.widgetHeader}>
            <Box px={1}>
                <Divider />
            </Box>
            <Box display="flex" justifyContent="flex-end">
                {content}
            </Box>
        </Box>
    );
}
