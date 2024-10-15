import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";

import { ScrollBox } from "components";

export function RgbView() {
    const { t } = useTranslation();

    return (
        <ScrollBox p={2}>
            <Box>{t("rgbDescription")}</Box>
        </ScrollBox>
    );
}
