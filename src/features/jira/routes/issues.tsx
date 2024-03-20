import { AddCircle, FilterAlt } from "@mui/icons-material";
import { Box, Button, FormControlLabel, List, ListItemButton, Typography, useTheme } from "@mui/material";
import { useEffect } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app";
import { Divider, IosSwitch, LinearProgress, ScrollBox } from "components";

import {
    useGetCurrentUserQuery,
    useGetIssuesQuery,
    useGetNovorenderMetaCustomFieldQuery,
    useGetPermissionsQuery,
} from "../jiraApi";
import {
    jiraActions,
    selectJiraAccessTokenData,
    selectJiraComponent,
    selectJiraFilters,
    selectJiraProject,
    selectJiraShowMarkers,
    selectJiraUser,
    selectMetaCustomfieldKey,
} from "../jiraSlice";

export function Issues() {
    const theme = useTheme();
    const history = useHistory();

    const project = useAppSelector(selectJiraProject);
    const component = useAppSelector(selectJiraComponent);
    const accessToken = useAppSelector(selectJiraAccessTokenData);
    const currentUser = useAppSelector(selectJiraUser);
    const metaCustomfieldKey = useAppSelector(selectMetaCustomfieldKey);
    const filters = useAppSelector(selectJiraFilters);
    const showMarkers = useAppSelector(selectJiraShowMarkers);
    const dispatch = useAppDispatch();

    // todo pagination / load on scroll whatever
    const {
        data: issues,
        isFetching: isFetchingIssues,
        isLoading: isLoadingIssues,
        isError: isErrorIssues,
    } = useGetIssuesQuery(
        {
            project: project?.key ?? "",
            component: component?.id ?? "",
            userId: currentUser?.accountId ?? "",
            filters,
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

    const { data: metaCustomfieldKeyRes } = useGetNovorenderMetaCustomFieldQuery(undefined, {
        skip: !accessToken,
    });

    useEffect(() => {
        if (!user || currentUser) {
            return;
        }

        dispatch(jiraActions.setUser(user));
    }, [dispatch, user, currentUser]);

    useEffect(() => {
        if (!metaCustomfieldKeyRes || metaCustomfieldKey) {
            return;
        }

        dispatch(jiraActions.setMetaCustomfieldKey(metaCustomfieldKeyRes));
    }, [dispatch, metaCustomfieldKey, metaCustomfieldKeyRes]);

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
                        {metaCustomfieldKey && (
                            <FormControlLabel
                                control={
                                    <IosSwitch
                                        size="medium"
                                        color="primary"
                                        checked={showMarkers}
                                        onChange={() => {
                                            dispatch(jiraActions.toggleShowMarkers());
                                        }}
                                    />
                                }
                                label={<Box fontSize={14}>Markers</Box>}
                            />
                        )}
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
                {isErrorIssues && !issues ? (
                    "An error occurred."
                ) : isLoadingIssues ? null : issues?.length ? (
                    <List sx={{ mx: -1 }} dense disablePadding>
                        {issues.map((issue) => (
                            <ListItemButton
                                sx={{ px: 1 }}
                                disableGutters
                                key={issue.key}
                                onClick={() => {
                                    history.push(`/issue/${issue.key}`);
                                    dispatch(jiraActions.setActiveIssue(issue.key));
                                }}
                                onMouseEnter={() => {
                                    dispatch(jiraActions.setHoveredEntity(issue.key));
                                }}
                                onMouseLeave={() => {
                                    dispatch(jiraActions.setHoveredEntity(""));
                                }}
                            >
                                {issue.key} - {issue.fields.summary}
                            </ListItemButton>
                        ))}
                    </List>
                ) : (
                    <Box flex={"1 1 100%"}>
                        <Typography textAlign={"center"} mt={1}>
                            No issues found.
                        </Typography>
                        {Object.values(filters).some((val) => val === true) && (
                            <Box width={1} mt={3} display="flex" justifyContent="center">
                                <Button
                                    variant="contained"
                                    onClick={() => {
                                        dispatch(jiraActions.clearFilters());
                                    }}
                                >
                                    Clear filters
                                </Button>
                            </Box>
                        )}
                    </Box>
                )}
            </ScrollBox>
        </>
    );
}
