import { Alert, Box } from "@mui/material";
import { ReactNode } from "react";

import { UiDeviationConfig } from "../deviationTypes";

export function RunLog({ data }: { data: UiDeviationConfig }) {
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
                                    Profile <strong>{profile.name}</strong>: some groups are empty. Ensure that both
                                    groups to analyse and groups to analyse against are not empty.
                                </>
                            );
                            break;
                        default:
                            msg = (
                                <>
                                    Profile <strong>{profile.name}</strong>: {entry.message}
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
