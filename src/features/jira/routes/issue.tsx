import { Add, ArrowBack, Edit } from "@mui/icons-material";
import { Box, Button, Typography, useTheme } from "@mui/material";
import { useHistory, useParams } from "react-router-dom";

import { Divider, LinearProgress, ScrollBox } from "components";

import { useGetIssueQuery, useGetPermissionsQuery } from "../jiraApi";
import { useAppSelector } from "app/store";
import { selectJiraProject } from "../jiraSlice";

export function Issue() {
    const theme = useTheme();
    const history = useHistory();
    const key = useParams<{ key: string }>().key;

    const project = useAppSelector(selectJiraProject);

    const {
        data: issue,
        isFetching: _isFetchingIssue,
        isLoading: isLoadingIssue,
        isError: isErrorIssue,
    } = useGetIssueQuery(
        {
            key,
        },
        { skip: !key }
    );

    const { data: permissions = [] } = useGetPermissionsQuery(
        {
            project: project?.key ?? "",
        },
        { skip: !project }
    );

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => history.push("/issues")} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        Back
                    </Button>
                    {permissions.includes("ADD_COMMENTS") && (
                        <Button onClick={() => {}} color="grey">
                            <Add sx={{ mr: 1 }} />
                            Comment todo
                        </Button>
                    )}
                    {permissions.includes("EDIT_ISSUES") && (
                        <Button onClick={() => history.push("/issues")} color="grey">
                            <Edit sx={{ mr: 1 }} />
                            Edit todo
                        </Button>
                    )}
                </Box>
            </Box>
            {isLoadingIssue ? (
                <Box>
                    <LinearProgress />
                </Box>
            ) : isErrorIssue || !issue ? (
                <>An error occured while loading issue {key}</>
            ) : (
                <ScrollBox p={1} pt={2} pb={3}>
                    <Typography variant="h6" fontWeight={600}>
                        {issue.fields.summary}
                    </Typography>
                    <Typography fontWeight={600}>{issue.fields.description ? "desc " : "no"}</Typography>
                </ScrollBox>
            )}
        </>
    );
}
