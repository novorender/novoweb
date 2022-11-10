import { AddCircle, FilterAlt } from "@mui/icons-material";
import { useHistory } from "react-router-dom";
import { Box, Button, List, ListItemButton, useTheme } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, LinearProgress, ScrollBox } from "components";

import { useGetCurrentUserQuery, useGetIssuesQuery, useGetPermissionsQuery } from "../jiraApi";
import {
    jiraActions,
    selectJiraAccessTokenData,
    selectJiraComponent,
    selectJiraProject,
    selectJiraUser,
} from "../jiraSlice";
import { useEffect } from "react";

export function Issues() {
    const theme = useTheme();
    const history = useHistory();

    const project = useAppSelector(selectJiraProject);
    const component = useAppSelector(selectJiraComponent);
    const accessToken = useAppSelector(selectJiraAccessTokenData);
    const currentUser = useAppSelector(selectJiraUser);
    const dispatch = useAppDispatch();

    // todo pagination / load on scroll whatever
    const {
        data: issues = [],
        isFetching: isFetchingIssues,
        isLoading: isLoadingIssues,
        isError: isErrorIssues,
    } = useGetIssuesQuery(
        {
            project: project?.key ?? "",
            component: component?.id ?? "",
            userId: currentUser?.accountId ?? "",
        },
        { skip: !project || !component || !accessToken, refetchOnMountOrArgChange: true }
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
        { skip: !project || !accessToken }
    );

    const { data: user } = useGetCurrentUserQuery(undefined, {
        skip: !accessToken,
    });

    useEffect(() => {
        if (!user || currentUser) {
            return;
        }

        dispatch(jiraActions.setUser(user));
    }, [dispatch, user, currentUser]);

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                        {/* todo */}
                        <Button
                            disabled={true}
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
