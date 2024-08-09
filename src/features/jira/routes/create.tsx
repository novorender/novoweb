import { ArrowBack, Close, Save } from "@mui/icons-material";
import {
    Autocomplete,
    Box,
    Button,
    FormControl,
    FormHelperText,
    FormLabel,
    IconButton,
    MenuItem,
    OutlinedInput,
    Select,
    Snackbar,
    TextField,
    useTheme,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { format, isValid } from "date-fns";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { dataApi } from "apis/dataV1";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useCreateBookmark } from "features/bookmarks/useCreateBookmark";
import { AsyncStatus } from "types/misc";
import { createCanvasSnapshot } from "utils/misc";
import { sleep } from "utils/time";

import {
    useAddAttachmentMutation,
    useCreateIssueMutation,
    useGetBaseIssueTypesQuery,
    useGetComponentsQuery,
    useGetCreateIssueMetadataQuery,
    useGetParentIssueTypesQuery,
    useLazyGetIssueSuggestionsQuery,
} from "../jiraApi";
import {
    jiraActions,
    selectJiraAccessTokenData,
    selectJiraComponent,
    selectJiraIssueType,
    selectJiraProject,
    selectJiraSpace,
    selectMetaCustomfieldKey,
} from "../jiraSlice";
import { AdfNode, Assignee, CreateIssueMetadata, IssueSuggestion } from "../types";
import { createIssueSnapshotAttachment, createLinkNode } from "../utils";

export function CreateIssue({ sceneId }: { sceneId: string }) {
    const theme = useTheme();
    const history = useHistory();
    const {
        state: { canvas },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const issueType = useAppSelector(selectJiraIssueType);
    const accessToken = useAppSelector(selectJiraAccessTokenData);
    const space = useAppSelector(selectJiraSpace);
    const project = useAppSelector(selectJiraProject);
    const component = useAppSelector(selectJiraComponent);
    const metaCustomfieldKey = useAppSelector(selectMetaCustomfieldKey);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [formValues, setFormValues] = useState({} as { [key: string]: any });

    const [assigneeOptions, setAssigneeOptions] = useState([] as Assignee[]);
    const [loadingAssignees, setLoadingAssignees] = useState(false);
    const [assigneeInputValue, setAssigneeInputValue] = useState("");
    const autoCompleteAssigneeRef = useRef(0);

    const [parentOptions, setParentOptions] = useState([] as IssueSuggestion[]);
    const [loadingParents, setLoadingParents] = useState(false);
    const [parentInputValue, setParentInputValue] = useState("");
    const autoCompleteParentRef = useRef(0);

    const [saveStatus, setSaveStatus] = useState(AsyncStatus.Initial);
    const [createIssue] = useCreateIssueMutation();
    const [addAttachment] = useAddAttachmentMutation();
    const createBookmark = useCreateBookmark();
    const today = useRef(new Date());

    const [getIssueSuggestions] = useLazyGetIssueSuggestionsQuery();

    const { data: parentIssueTypes = [] } = useGetParentIssueTypesQuery(
        {
            project: project?.id ?? "",
        },
        { skip: !project, refetchOnMountOrArgChange: true },
    );

    const { data: baseIssueTypes = [] } = useGetBaseIssueTypesQuery(
        {
            accessToken,
            projectId: project?.id ?? "",
            space: space?.id ?? "",
        },
        { skip: !accessToken || !project || !space, refetchOnMountOrArgChange: true },
    );

    const {
        data: createIssueMetadata,
        isFetching: isFetchingCreateIssueMetadata,
        isUninitialized: isUninitializedCreateIssueMetadata,
    } = useGetCreateIssueMetadataQuery(
        {
            issueTypeId: issueType?.id ?? "",
            projectKey: project?.key ?? "",
        },
        { skip: !issueType || !project },
    );

    const { data: componentOptions } = useGetComponentsQuery(
        { space: space?.id ?? "", project: project?.key ?? "", accessToken },
        { skip: !space || !project || !accessToken },
    );

    useEffect(
        function initIssueType() {
            if (issueType || !baseIssueTypes.length) {
                return;
            }

            dispatch(
                jiraActions.setIssueType(
                    baseIssueTypes.find((type) => /model[l]?[\s_-]?task/gi.test(type.name)) ?? baseIssueTypes[0],
                ),
            );
        },
        [issueType, baseIssueTypes, dispatch],
    );

    const handleCreate = async () => {
        if (!issueType || !project || !space || !component) {
            return;
        }

        setSaveStatus(AsyncStatus.Loading);
        const bmId = window.crypto.randomUUID();
        const bm = createBookmark();
        const snapshot = await createCanvasSnapshot(canvas, 5000, 5000);
        const saved = await dataApi.saveBookmarks(sceneId, [{ ...bm, id: bmId, name: bmId }], { group: bmId });

        if (!saved) {
            setSaveStatus(AsyncStatus.Error);
            return;
        }

        const body = {
            fields: {
                ...(metaCustomfieldKey && createIssueMetadata && createIssueMetadata[metaCustomfieldKey]
                    ? { [metaCustomfieldKey]: JSON.stringify({ position: bm.explorerState?.camera.position }) }
                    : {}),
                issuetype: {
                    name: issueType.name,
                },
                project: {
                    key: project.key,
                },
                summary: formValues.summary,
                description: {
                    type: "doc",
                    version: 1,
                    content: [
                        ...(formValues.description
                            ? [
                                  {
                                      type: "paragraph",
                                      content: formValues.description
                                          .split("\n")
                                          .map((node: string, idx: number, arr: unknown[]): AdfNode[] => {
                                              let res: AdfNode[] = node
                                                  ? [
                                                        {
                                                            type: "text",
                                                            text: node,
                                                        },
                                                    ]
                                                  : [];

                                              if (idx !== arr.length - 1) {
                                                  res = res.concat({
                                                      type: "hardBreak",
                                                  });
                                              }

                                              return res;
                                          })
                                          .flat(),
                                  },
                              ]
                            : []),
                        createLinkNode(bmId),
                    ],
                },
                ...(formValues.assignee ? { assignee: { id: formValues.assignee.accountId } } : {}),
                ...(formValues.issueComponents
                    ? { components: [component.id, ...formValues.issueComponents].map((id) => ({ id })) }
                    : { components: [{ id: component.id }] }),
                ...(formValues.duedate ? { duedate: format(new Date(formValues.duedate), "yyyy-MM-dd") } : {}),
                ...(formValues.parent ? { parent: { key: formValues.parent.key } } : {}),
                ...(formValues.fixVersions
                    ? { fixVersions: formValues.fixVersions.map((ver: { id: string }) => ({ id: ver.id })) }
                    : {}),
            },
        };

        try {
            const res = await createIssue({ body });

            if ("error" in res) {
                throw res.error;
            }

            if (snapshot) {
                await addAttachment({ issueId: res.data.id, form: createIssueSnapshotAttachment(snapshot) });
            }

            setSaveStatus(AsyncStatus.Success);
            history.goBack();
        } catch (e) {
            console.warn(e);
            setSaveStatus(AsyncStatus.Error);
        }
    };

    if (!space || !project || !component) {
        return null;
    }

    const { summary, description, components, assignee, duedate, parent, fixVersions } =
        createIssueMetadata ?? ({} as CreateIssueMetadata["fields"]);

    const loadingFormMeta = isUninitializedCreateIssueMetadata || isFetchingCreateIssueMetadata;

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => history.goBack()} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        {t("back")}
                    </Button>
                    <Button
                        disabled={saveStatus !== AsyncStatus.Initial || !formValues.summary || !project || !issueType}
                        onClick={() => handleCreate()}
                        color="grey"
                    >
                        <Save sx={{ mr: 1 }} />
                        {t("create")}
                    </Button>
                </Box>
            </Box>

            {(loadingFormMeta || saveStatus === AsyncStatus.Loading) && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}

            <ScrollBox p={1} pb={3}>
                {space && project && component ? (
                    <>
                        <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                            <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                <FormLabel
                                    sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                                    htmlFor={"project"}
                                >
                                    {t("project")}
                                </FormLabel>
                            </Box>

                            <Select
                                readOnly
                                value={project.key}
                                inputProps={{
                                    id: "project",
                                }}
                            >
                                <MenuItem value={project.key}>
                                    {project.key} {t("-")}
                                    {project.name}
                                </MenuItem>
                            </Select>
                            <FormHelperText>{t("canOnlyBeChangedByAdminsInSettings.")}</FormHelperText>
                        </FormControl>

                        <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 1 }}>
                            <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                <FormLabel
                                    sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                                    htmlFor={"issueType"}
                                >
                                    {t("type")}
                                </FormLabel>
                            </Box>

                            <Select
                                MenuProps={{ sx: { maxHeight: 300 } }}
                                value={issueType?.id ?? ""}
                                inputProps={{
                                    id: "issueType",
                                }}
                                onChange={(e) =>
                                    dispatch(
                                        jiraActions.setIssueType(
                                            baseIssueTypes.find((type) => type.id === e.target.value),
                                        ),
                                    )
                                }
                            >
                                {baseIssueTypes.map((option) => (
                                    <MenuItem key={option.id} value={option.id}>
                                        {option.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Divider sx={{ my: 1 }} />

                        {!loadingFormMeta && (
                            <>
                                {summary && (
                                    <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 2 }}>
                                        <Box
                                            width={1}
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                        >
                                            <FormLabel
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
                                    <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 2 }}>
                                        <Box
                                            width={1}
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                        >
                                            <FormLabel
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
                                            name="description"
                                            inputProps={{
                                                id: "description",
                                            }}
                                        />
                                    </FormControl>
                                )}

                                {assignee && assignee.autoCompleteUrl && (
                                    <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 2 }}>
                                        <Box
                                            width={1}
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                        >
                                            <FormLabel
                                                sx={{ fontWeight: 600, color: "text.secondary" }}
                                                htmlFor={"jiraAssignee"}
                                            >
                                                {assignee.name}
                                            </FormLabel>
                                        </Box>
                                        <Autocomplete
                                            id="jiraAssignee"
                                            fullWidth
                                            options={assigneeOptions}
                                            getOptionLabel={(opt) => opt.displayName}
                                            isOptionEqualToValue={(option, value) =>
                                                option.accountId === value.accountId
                                            }
                                            value={formValues.assignee ?? null}
                                            loading={!assigneeInputValue || loadingAssignees}
                                            loadingText={
                                                assigneeInputValue ? "Loading users..." : "Start typing to load users."
                                            }
                                            size="small"
                                            onChange={(_e, value) => {
                                                setFormValues((state) => ({ ...state, assignee: value }));
                                            }}
                                            onInputChange={async (_evt, value) => {
                                                const id = ++autoCompleteAssigneeRef.current;
                                                setAssigneeInputValue(value);

                                                if (!value) {
                                                    setAssigneeOptions([]);
                                                    setLoadingAssignees(false);
                                                    return;
                                                }

                                                setLoadingAssignees(true);
                                                await sleep(250);

                                                if (id !== autoCompleteAssigneeRef.current) {
                                                    return;
                                                }

                                                const res = await fetch(assignee.autoCompleteUrl + value!, {
                                                    headers: { authorization: `Bearer ${accessToken}` },
                                                })
                                                    .then((r) => {
                                                        if (r.ok) {
                                                            return r;
                                                        } else {
                                                            throw r;
                                                        }
                                                    })
                                                    .then((r) => r.json())
                                                    .catch((err) => {
                                                        console.warn(err);
                                                        return [];
                                                    });

                                                if (id !== autoCompleteAssigneeRef.current) {
                                                    return;
                                                }

                                                setAssigneeOptions(res);
                                                setLoadingAssignees(false);
                                            }}
                                            renderInput={(params) => (
                                                <TextField
                                                    required={assignee.required && !assignee.hasDefaultValue}
                                                    variant="outlined"
                                                    value={assigneeInputValue}
                                                    {...params}
                                                />
                                            )}
                                            renderOption={(props, option) => (
                                                <li {...props} key={option.accountId}>
                                                    {option.displayName}
                                                </li>
                                            )}
                                        />
                                    </FormControl>
                                )}

                                {fixVersions && (
                                    <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 2 }}>
                                        <Box
                                            width={1}
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                        >
                                            <FormLabel
                                                sx={{ fontWeight: 600, color: "text.secondary" }}
                                                htmlFor={"jiraFixVersions"}
                                            >
                                                {fixVersions.name}
                                            </FormLabel>
                                        </Box>
                                        <Autocomplete
                                            id="jiraFixVersions"
                                            fullWidth
                                            multiple
                                            options={fixVersions.allowedValues}
                                            getOptionLabel={(opt) => `${opt.name}`}
                                            isOptionEqualToValue={(option, value) => option.id === value.id}
                                            value={formValues.fixVersions ?? []}
                                            size="small"
                                            onChange={(_e, value) => {
                                                setFormValues((state) => ({ ...state, fixVersions: value }));
                                            }}
                                            renderInput={(params) => (
                                                <TextField
                                                    required={fixVersions.required && !fixVersions.hasDefaultValue}
                                                    variant="outlined"
                                                    {...params}
                                                />
                                            )}
                                            renderOption={(props, option) => (
                                                <li {...props} key={option.id}>
                                                    {option.name}
                                                </li>
                                            )}
                                        />
                                    </FormControl>
                                )}

                                {parent && (
                                    <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 2 }}>
                                        <Box
                                            width={1}
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                        >
                                            <FormLabel
                                                sx={{ fontWeight: 600, color: "text.secondary" }}
                                                htmlFor={"jiraParent"}
                                            >
                                                {parent.name}
                                            </FormLabel>
                                        </Box>
                                        <Autocomplete
                                            id="jiraParent"
                                            fullWidth
                                            options={parentOptions}
                                            getOptionLabel={(opt) => `${opt.key} - ${opt.summaryText}`}
                                            isOptionEqualToValue={(option, value) => option.id === value.id}
                                            value={formValues.parent ?? null}
                                            loading={!parentInputValue || loadingParents}
                                            loadingText={
                                                parentInputValue ? "Loading issues..." : "Start typing to load issues."
                                            }
                                            size="small"
                                            onChange={(_e, value) => {
                                                setFormValues((state) => ({ ...state, parent: value }));
                                            }}
                                            onInputChange={async (_evt, value) => {
                                                const id = ++autoCompleteParentRef.current;
                                                setParentInputValue(value);

                                                if (!value) {
                                                    setParentOptions([]);
                                                    setLoadingParents(false);
                                                    return;
                                                }

                                                setLoadingParents(true);
                                                await sleep(250);

                                                if (id !== autoCompleteParentRef.current) {
                                                    return;
                                                }

                                                const res = await getIssueSuggestions(
                                                    {
                                                        project: project.id,
                                                        query: value,
                                                        issueTypes: parentIssueTypes?.map((type) => type.id),
                                                    },
                                                    true,
                                                )
                                                    .unwrap()
                                                    .catch((err) => {
                                                        console.warn(err);
                                                        return null;
                                                    });

                                                if (id !== autoCompleteParentRef.current) {
                                                    return;
                                                }

                                                const options = res?.sections[1] && res?.sections[1].issues;
                                                setParentOptions(options ?? []);
                                                setLoadingParents(false);
                                            }}
                                            renderInput={(params) => (
                                                <TextField
                                                    required={parent.required && !parent.hasDefaultValue}
                                                    variant="outlined"
                                                    value={parentInputValue}
                                                    {...params}
                                                />
                                            )}
                                            renderOption={(props, option) => (
                                                <li {...props} key={option.id}>
                                                    {option.key} {t("-")}
                                                    {option.summaryText}
                                                </li>
                                            )}
                                        />
                                    </FormControl>
                                )}

                                <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 2 }}>
                                    <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                        <FormLabel
                                            sx={{ fontWeight: 600, mb: 0.5, color: "text.secondary" }}
                                            htmlFor={"issueComponents"}
                                        >
                                            {t("components")}
                                        </FormLabel>
                                    </Box>
                                    <Select
                                        MenuProps={{ sx: { maxHeight: 300 } }}
                                        multiple
                                        value={[
                                            component.id,
                                            ...(components ? (formValues["issueComponents"] ?? []) : []),
                                        ]}
                                        inputProps={{
                                            id: "issueComponents",
                                        }}
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
                                            <MenuItem
                                                disabled={option.id === component.id}
                                                key={option.id}
                                                value={option.id}
                                            >
                                                {option.name}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    <FormHelperText>
                                        {t("defaultComponentCanOnlyBeChangedByAdminsInSettings.")}
                                    </FormHelperText>
                                </FormControl>

                                {duedate && (
                                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                                        <Box
                                            width={1}
                                            display="flex"
                                            justifyContent="space-between"
                                            alignItems="center"
                                        >
                                            <FormLabel
                                                sx={{ fontWeight: 600, color: "text.secondary" }}
                                                htmlFor={"jiraDueDate"}
                                            >
                                                {duedate.name}
                                            </FormLabel>
                                        </Box>
                                        <DatePicker
                                            value={formValues.duedate ?? null}
                                            minDate={today.current}
                                            onChange={(newDate: Date | null) => {
                                                setFormValues((state) => ({
                                                    ...state,
                                                    duedate: newDate
                                                        ? isValid(newDate)
                                                            ? newDate.toISOString()
                                                            : ""
                                                        : "",
                                                }));
                                            }}
                                            slotProps={{
                                                textField: {
                                                    id: "jiraDueDate",
                                                    variant: "outlined",
                                                    size: "small",
                                                    required: duedate.required && !duedate.defaultValue,
                                                },
                                            }}
                                        />
                                    </FormControl>
                                )}
                            </>
                        )}
                    </>
                ) : (
                    "An error occurred."
                )}
            </ScrollBox>
            <Snackbar
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                sx={{
                    width: { xs: "auto", sm: 350 },
                    bottom: { xs: "auto", sm: 24 },
                    top: { xs: 24, sm: "auto" },
                }}
                autoHideDuration={2500}
                open={saveStatus === AsyncStatus.Error}
                onClose={() => setSaveStatus(AsyncStatus.Initial)}
                message={"Failed to create Jira issue."}
                action={
                    <IconButton
                        size="small"
                        aria-label="close"
                        color="inherit"
                        onClick={() => setSaveStatus(AsyncStatus.Initial)}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                }
            />
        </>
    );
}
