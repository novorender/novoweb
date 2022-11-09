import { AddCircle, FilterAlt } from "@mui/icons-material";
import { useHistory } from "react-router-dom";
import { Box, Button, List, ListItemButton, useTheme } from "@mui/material";

import { useAppSelector } from "app/store";
import { Divider, LinearProgress, ScrollBox } from "components";

import { useGetIssuesQuery, useGetPermissionsQuery } from "../jiraApi";
import { selectJiraComponent, selectJiraProject } from "../jiraSlice";

export function Issues() {
    const theme = useTheme();
    const history = useHistory();

    const project = useAppSelector(selectJiraProject);
    const component = useAppSelector(selectJiraComponent);

    const {
        data: issues = [],
        isFetching: isFetchingIssues,
        isLoading: isLoadingIssues,
        isError: isErrorIssues,
    } = useGetIssuesQuery(
        {
            project: project?.id ?? "",
            component: component?.id ?? "",
        },
        { skip: !project || !component, refetchOnMountOrArgChange: true }
    );

    const {
        data: permissions = [],
        isFetching: _isFetchingPermissions,
        isLoading: _isLoadingPermissions,
        isError: _isErrorPermissions,
    } = useGetPermissionsQuery(
        {
            project: project?.key ?? "",
        },
        { skip: !project }
    );

    console.log(permissions);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        <Button
                            onClick={() => {
                                history.push("/filters");
                            }}
                            color="grey"
                        >
                            <FilterAlt sx={{ mr: 1 }} />
                            Filters
                        </Button>
                        {permissions.includes("CREATE_ISSUES") && (
                            <Button
                                onClick={() => {
                                    history.push("/create");
                                }}
                                color="grey"
                            >
                                <AddCircle sx={{ mr: 1 }} />
                                Create
                            </Button>
                        )}
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
