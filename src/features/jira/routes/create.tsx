import { useEffect } from "react";
import { ArrowBack } from "@mui/icons-material";
import {
    Box,
    Button,
    FormControl,
    FormHelperText,
    FormLabel,
    MenuItem,
    OutlinedInput,
    Select,
    Typography,
    useTheme,
} from "@mui/material";
import { useHistory } from "react-router-dom";

import { Divider, ScrollBox } from "components";
import { selectProjectSettings } from "slices/renderSlice";
import { useAppDispatch, useAppSelector } from "app/store";

import { useGetCreateIssueMetadataQuery, useGetIssueTypeScreenSchemeQuery, useGetIssueTypesQuery } from "../jiraApi";
import { jiraActions, selectIssueType } from "../jiraSlice";
import { CreateIssueMetadata } from "../types";

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
        data: createIssueMetadata,
        isFetching: _isFetchingCreateIssueMetadata,
        isLoading: _isLoadingCreateIssueMetadata,
        isError: _isErrorCreateIssueMetadata,
    } = useGetCreateIssueMetadataQuery(
        {
            issueTypeId: issueType?.id ?? "",
        },
        { skip: !issueType }
    );
    console.table(createIssueMetadata);

    useEffect(
        function initIssueType() {
            if (issueType || !issueTypes.length) {
                return;
            }

            dispatch(jiraActions.setIssueType(issueTypes[0]));
        },
        [issueType, issueTypes, dispatch]
    );

    const { summary, description, components, reporter, assignee, ...fields } =
        createIssueMetadata ?? ({} as CreateIssueMetadata["fields"]);

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
            <ScrollBox p={1} pb={3}>
                <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                    <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                        <FormLabel
                            component="legend"
                            sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                            htmlFor={"project"}
                        >
                            Project
                        </FormLabel>
                    </Box>

                    <Select readOnly value={settings.project} id={"project"}>
                        <MenuItem value={settings.project}>{settings.project}</MenuItem>
                    </Select>
                    <FormHelperText>Can only be changed by admins in settings.</FormHelperText>
                </FormControl>

                <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                    <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                        <FormLabel
                            component="legend"
                            sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                            htmlFor={"issueType"}
                        >
                            Type
                        </FormLabel>
                    </Box>

                    <Select
                        value={issueType?.id ?? ""}
                        id={"issueType"}
                        onChange={(e) =>
                            dispatch(jiraActions.setIssueType(issueTypes.find((type) => type.id === e.target.value)))
                        }
                    >
                        {issueTypes.map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                                {option.name}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                <Divider sx={{ my: 1 }} />

                {summary && (
                    <FormControl component="fieldset" fullWidth size="small" sx={{ pb: 1 }}>
                        <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                            <FormLabel
                                component="legend"
                                sx={{ fontWeight: 600, color: "text.secondary" }}
                                htmlFor={"summary"}
                            >
                                {summary.name}
                            </FormLabel>
                        </Box>
                        <OutlinedInput
                            autoComplete="off"
                            required={summary.required && !summary.hasDefaultValue}
                            value={""}
                            onChange={(evt) => {}}
                            maxRows={5}
                            id={"summary"}
                        />
                    </FormControl>
                )}
            </ScrollBox>
        </>
    );
}
