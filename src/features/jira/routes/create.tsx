import { ArrowBack } from "@mui/icons-material";
import { Box, Button, useTheme } from "@mui/material";
import { useHistory } from "react-router-dom";

import { Divider, ScrollBox } from "components";
import { selectProjectSettings } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";

import { useGetCreateIssueMetadataQuery, useGetIssueTypesQuery } from "../jiraApi";
import { useEffect } from "react";
import { jiraActions, selectIssueType } from "../jiraSlice";

export function CreateIssue() {
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();

    const issueType = useAppSelector(selectIssueType);
    const { jira: jiraSettings } = useAppSelector(selectProjectSettings);
    const settings = jiraSettings || { project: "", component: "", space: "" }; // TODO(OLA): set default && validate before

    const {
        data: issueTypes = [],
        isFetching: _isFetchingIssuesTypes,
        isLoading: _isLoadingIssuesTypes,
        isError: _isErrorIssuesTypes,
    } = useGetIssueTypesQuery({
        project: settings.project,
    });

    const {
        data: createIssueMetadata = [],
        isFetching: _isFetchingCreateIssueMetadata,
        isLoading: _isLoadingCreateIssueMetadata,
        isError: _isErrorCreateIssueMetadata,
    } = useGetCreateIssueMetadataQuery(
        {
            issueTypeId: issueType?.id ?? "",
        },
        { skip: !issueType }
    );

    useEffect(
        function initIssueType() {
            if (issueType || !issueTypes.length) {
                return;
            }

            dispatch(jiraActions.setIssueType(issueTypes[0]));
        },
        [issueType, issueTypes, dispatch]
    );

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Button onClick={() => history.goBack()} color="grey">
                    <ArrowBack sx={{ mr: 1 }} />
                    Back
                </Button>
            </Box>
            <ScrollBox p={1}>CreateIssue</ScrollBox>
        </>
    );
}
