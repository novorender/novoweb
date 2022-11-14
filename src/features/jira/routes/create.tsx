import { useEffect, useRef, useState } from "react";
import { ArrowBack, Close, Save } from "@mui/icons-material";
import {
    Autocomplete,
    Box,
    Button,
    FormControl,
    FormHelperText,
    FormLabel,
    MenuItem,
    OutlinedInput,
    Select,
    useTheme,
    TextField,
    Snackbar,
    IconButton,
} from "@mui/material";
import { useHistory } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

import { dataApi } from "app";
import { Divider, LinearProgress, ScrollBox } from "components";
import { useAppDispatch, useAppSelector } from "app/store";
import { sleep } from "utils/timers";
import { AsyncStatus } from "types/misc";
import { useCreateBookmark } from "features/bookmarks";
import { createCanvasSnapshot } from "utils/misc";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import {
    useAddAttachmentMutation,
    useCreateIssueMutation,
    useGetComponentsQuery,
    useGetCreateIssueMetadataQuery,
    useGetIssueTypesQuery,
} from "../jiraApi";
import {
    jiraActions,
    selectJiraIssueType,
    selectJiraAccessTokenData,
    selectJiraComponent,
    selectJiraProject,
    selectJiraSpace,
} from "../jiraSlice";
import { Assignee, CreateIssueMetadata } from "../types";

export function CreateIssue({ sceneId }: { sceneId: string }) {
    const theme = useTheme();
    const history = useHistory();
    const {
        state: { canvas },
    } = useExplorerGlobals(true);
    const dispatch = useAppDispatch();

    const issueType = useAppSelector(selectJiraIssueType);
    const accessToken = useAppSelector(selectJiraAccessTokenData);
    const space = useAppSelector(selectJiraSpace);
    const project = useAppSelector(selectJiraProject);
    const component = useAppSelector(selectJiraComponent);
    const [formValues, setFormValues] = useState({} as { [key: string]: any });
    const [assigneeOptions, setAssigneeOptions] = useState([] as Assignee[]);
    const [loadingAssignees, setLoadingAssignees] = useState(false);
    const [assigneeInputValue, setAssigneeInputValue] = useState("");
    const autoCompleteRef = useRef(0);
    const [saveStatus, setSaveStatus] = useState(AsyncStatus.Initial);
    const [createIssue] = useCreateIssueMutation();
    const [addAttachment] = useAddAttachmentMutation();
    const createBookmark = useCreateBookmark();

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
        isFetching: isFetchingCreateIssueMetadata,
        isUninitialized: isUninitializedCreateIssueMetadata,
        isLoading: _isLoadingCreateIssueMetadata,
        isError: _isErrorCreateIssueMetadata,
    } = useGetCreateIssueMetadataQuery(
        {
            issueTypeId: issueType?.id ?? "",
            projectKey: project?.key ?? "",
        },
        { skip: !issueType || !project }
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

    const { summary, description, components, assignee, ..._fields } =
        createIssueMetadata ?? ({} as CreateIssueMetadata["fields"]);

    if (!space || !project || !component) {
        // todo
        return null;
    }

    const handleCreate = async () => {
        if (!issueType || !project) {
            return;
        }

        setSaveStatus(AsyncStatus.Loading);
        const bmId = uuidv4();
        const bm = createBookmark();
        const snapshot = await createCanvasSnapshot(canvas, 5000, 5000);
        const saved = await dataApi.saveBookmarks(sceneId, [{ ...bm, id: bmId, name: bmId }], { group: bmId });

        if (!saved) {
            setSaveStatus(AsyncStatus.Error);
            return;
        }

        const body = {
            fields: {
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
                                          .map((node: string, idx: number, arr: any[]) => {
                                              let res: any[] = node
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
                        {
                            type: "heading",
                            attrs: {
                                level: 3,
                            },
                            content: [
                                {
                                    type: "text",
                                    text: "Novorender link",
                                    marks: [
                                        {
                                            type: "link",
                                            attrs: {
                                                href: `${window.location.origin}${window.location.pathname}?bookmarkId=${bmId}`,
                                            },
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
                ...(formValues.assignee ? { assignee: { id: formValues.assignee.accountId } } : {}),
                ...(formValues.issueComponents
                    ? { components: [component.id, ...formValues.issueComponents].map((id) => ({ id })) }
                    : { components: [{ id: component.id }] }),
            },
        };

        try {
            const res = await createIssue({ body });

            if ("error" in res) {
                throw res.error;
            }

            if (snapshot) {
                const formData = new FormData();

                // https://stackoverflow.com/a/61321728
                function DataURIToBlob(dataURI: string) {
                    const splitDataURI = dataURI.split(",");
                    const byteString =
                        splitDataURI[0].indexOf("base64") >= 0 ? atob(splitDataURI[1]) : decodeURI(splitDataURI[1]);
                    const mimeString = splitDataURI[0].split(":")[1].split(";")[0];

                    const ia = new Uint8Array(byteString.length);
                    for (let i = 0; i < byteString.length; i++) {
                        ia[i] = byteString.charCodeAt(i);
                    }

                    return new Blob([ia], { type: mimeString });
                }

                formData.append("file", DataURIToBlob(snapshot), "Novorender model image");
                await addAttachment({ issueId: res.data.id, form: formData });
            }

            setSaveStatus(AsyncStatus.Success);
            history.goBack();
        } catch (e) {
            console.warn(e);
            setSaveStatus(AsyncStatus.Error);
        }
    };

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
                        Back
                    </Button>
                    <Button
                        disabled={saveStatus !== AsyncStatus.Initial || !formValues.summary || !project || !issueType}
                        onClick={() => handleCreate()}
                        color="grey"
                    >
                        <Save sx={{ mr: 1 }} />
                        Create
                    </Button>
                </Box>
            </Box>

            {(loadingFormMeta || saveStatus === AsyncStatus.Loading) && (
                <Box>
                    <LinearProgress />
                </Box>
            )}

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

                {!loadingFormMeta && (
                    <>
                        {summary && (
                            <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 2 }}>
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
                            <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 2 }}>
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

                        {assignee && assignee.autoCompleteUrl && (
                            <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 2 }}>
                                <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
                                    <FormLabel
                                        component="legend"
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
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
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
                                        const id = ++autoCompleteRef.current;
                                        setAssigneeInputValue(value);

                                        if (!value) {
                                            setAssigneeOptions([]);
                                            setLoadingAssignees(false);
                                            return;
                                        }

                                        setLoadingAssignees(true);
                                        await sleep(250);

                                        if (id !== autoCompleteRef.current) {
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

                                        if (id !== autoCompleteRef.current) {
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
                                />
                            </FormControl>
                        )}

                        <FormControl component="fieldset" fullWidth size="small" sx={{ mb: 2 }}>
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
                            <FormHelperText>
                                Default component can only be changed by admins in settings.
                            </FormHelperText>
                        </FormControl>
                    </>
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
