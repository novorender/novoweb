import { useEffect, useState } from "react";
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
    useTheme,
} from "@mui/material";
import { useHistory } from "react-router-dom";

import { Divider, ScrollBox } from "components";
import { useAppDispatch, useAppSelector } from "app/store";

import { useGetComponentsQuery, useGetCreateIssueMetadataQuery, useGetIssueTypesQuery } from "../jiraApi";
import {
    jiraActions,
    selectIssueType,
    selectJiraAccessTokenData,
    selectJiraComponent,
    selectJiraProject,
    selectJiraSpace,
} from "../jiraSlice";
import { CreateIssueMetadata } from "../types";

export function CreateIssue() {
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();

    const issueType = useAppSelector(selectIssueType);
    const accessToken = useAppSelector(selectJiraAccessTokenData);
    const space = useAppSelector(selectJiraSpace);
    const project = useAppSelector(selectJiraProject);
    const component = useAppSelector(selectJiraComponent);
    const [formValues, setFormValues] = useState({} as { [key: string]: any });

    const {
        data: issueTypes = [],
        isFetching: _isFetchingIssuesTypes,
        isLoading: _isLoadingIssuesTypes,
        isError: _isErrorIssuesTypes,
    } = useGetIssueTypesQuery({
        project: project?.key ?? "",
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

    const { data: componentOptions } = useGetComponentsQuery(
        { space: space?.id ?? "", project: project?.key ?? "", accessToken },
        { skip: !space || !project || !accessToken }
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

    const { summary, description, components, reporter, assignee, ...fields } =
        createIssueMetadata ?? ({} as CreateIssueMetadata["fields"]);

    if (!space || !project || !component) {
        // todo
        return null;
    }

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

                    <Select readOnly value={project.key} id={"project"}>
                        <MenuItem value={project.key}>
                            {project.key} - {project.name}
                        </MenuItem>
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
                            value={formValues["summary"] ?? summary.defaultValue ?? ""}
                            onChange={(evt) => {
                                setFormValues((state) => ({ ...state, summary: evt.target.value }));
                            }}
                            id={"summary"}
                        />
                    </FormControl>
                )}

                {description && (
                    <FormControl component="fieldset" fullWidth size="small" sx={{ pb: 1 }}>
                        <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                            <FormLabel
                                component="legend"
                                sx={{ fontWeight: 600, color: "text.secondary" }}
                                htmlFor={"description"}
                            >
                                {description.name}
                            </FormLabel>
                        </Box>
                        <OutlinedInput
                            autoComplete="off"
                            multiline={true}
                            required={description.required && !description.hasDefaultValue}
                            value={formValues["description"] ?? description.defaultValue ?? ""}
                            onChange={(evt) => {
                                setFormValues((state) => ({ ...state, description: evt.target.value }));
                            }}
                            maxRows={5}
                            minRows={5}
                            id={"description"}
                        />
                    </FormControl>
                )}

                <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                    <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                        <FormLabel
                            component="legend"
                            sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                            htmlFor={"issueComponents"}
                        >
                            Components
                        </FormLabel>
                    </Box>

                    <Select
                        multiple
                        value={[component.id, ...(components ? formValues["issueComponents"] ?? [] : [])]}
                        id={"issueComponents"}
                        onChange={({ target: { value } }) => {
                            if (!Array.isArray(value)) {
                                return;
                            }

                            setFormValues((state) => ({
                                ...state,
                                issueComponents: value.filter((comp) => comp !== component.id),
                            }));
                        }}
                    >
                        {(componentOptions ?? []).map((option) => (
                            <MenuItem disabled={option.id === component.id} key={option.id} value={option.id}>
                                {option.name}
                            </MenuItem>
                        ))}
                    </Select>
                    <FormHelperText>Default component can only be changed by admins in settings.</FormHelperText>
                </FormControl>
            </ScrollBox>
        </>
    );
}
