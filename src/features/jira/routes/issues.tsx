import { Box, useTheme } from "@mui/material";
import { useAppSelector } from "app/store";
import { ScrollBox } from "components";
import { selectProjectSettings } from "slices/renderSlice";

import { useGetIssuesQuery } from "../jiraApi";

export function Issues() {
    const theme = useTheme();

    const { jira: jiraSettings } = useAppSelector(selectProjectSettings);
    const settings = jiraSettings || { project: "", component: "", space: "" }; // TODO(OLA): set default
    const {
        data: issues = [],
        isFetching: isFetchingIssues,
        isError: isIssuesError,
    } = useGetIssuesQuery({
        project: settings.project,
        component: settings.component,
    });

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            <ScrollBox p={1} pb={3}>
                ISSUES: <br />C{String(issues.length)} F:{String(isFetchingIssues)} E:{String(isIssuesError)}
            </ScrollBox>
        </>
    );
}
