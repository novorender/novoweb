import { FilterAlt } from "@mui/icons-material";
import { Link, useHistory } from "react-router-dom";
import { Box, Button, List, ListItemButton, useTheme } from "@mui/material";

import { useAppSelector } from "app/store";
import { Divider, LinearProgress, ScrollBox } from "components";
import { selectProjectSettings } from "slices/renderSlice";

import { useGetIssuesQuery, useGetPermissionsQuery } from "../jiraApi";

export function Issues() {
    const theme = useTheme();
    const history = useHistory();

    const { jira: jiraSettings } = useAppSelector(selectProjectSettings);
    const settings = jiraSettings || { project: "", component: "", space: "" }; // TODO(OLA): set default
    const {
        data: issues = [],
        isFetching: isFetchingIssues,
        isLoading: isLoadingIssues,
        isError: isErrorIssues,
    } = useGetIssuesQuery({
        project: settings.project,
        component: settings.component,
    });

    const {
        data: _permissions,
        isFetching: _isFetchingPermissions,
        isLoading: _isLoadingPermissions,
        isError: _isErrorPermissions,
    } = useGetPermissionsQuery({
        project: settings.project,
    });

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex">
                        <Button component={Link} to={`/filters`} color="grey">
                            <FilterAlt sx={{ mr: 1 }} />
                            Filters
                        </Button>
                    </Box>
                </>
            </Box>
            {isFetchingIssues ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}
            <ScrollBox p={1} pb={3}>
                {isErrorIssues ? (
                    "An error occured."
                ) : isLoadingIssues ? null : (
                    <List sx={{ mx: -1 }} dense disablePadding>
                        {issues.map((issue) => (
                            <ListItemButton
                                sx={{ px: 1 }}
                                disableGutters
                                key={issue.key}
                                onClick={() => history.push(`/issue/${issue.key}`)}
                            >
                                {issue.key} - {issue.fields.summary}
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </ScrollBox>
        </>
    );
}
