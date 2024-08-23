import { Alert, Box } from "@mui/material";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { UiDeviationConfig } from "../deviationTypes";

export function RunLog({ data }: { data: UiDeviationConfig }) {
    const { t } = useTranslation();

    if (!data.runData) {
        return;
    }

    const { log } = data.runData;

    if (!log || !log.length) {
        return;
    }

    return (
        <Box mx={2} mt={2}>
            {log
                .map((entry, i) => {
                    const profile = data.profiles.find((p) => p.id === entry.id);
                    if (!profile) {
                        return;
                    }

                    let msg: ReactNode;
                    switch (entry.message) {
                        case "EMPTY_DEVIATION_GROUPS":
                            msg = (
                                <>
                                    {t("profile")}
                                    <strong>{profile.name}</strong>
                                    {t("emptyGroupsMessage")}
                                </>
                            );
                            break;
                        default:
                            msg = (
                                <>
                                    {t("profile")}
                                    <strong>{profile.name}</strong>: {entry.message}
                                </>
                            );
                    }

                    return (
                        <Alert key={i} severity={entry.severity}>
                            {msg}
                        </Alert>
                    );
                })
                .filter((e) => e)}
        </Box>
    );
}
