import { AddCircle, ArrowBack, ArrowDownward, ArrowUpward, CheckCircle, Delete } from "@mui/icons-material";
import {
    Alert,
    Box,
    Button,
    FormControl,
    FormControlLabel,
    IconButton,
    InputAdornment,
    InputLabel,
    List,
    ListItemButton,
    ListItemText,
    MenuItem,
    Radio,
    RadioGroup,
    Select,
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useLazyPreviewOmega365ProjectViewConfigQuery } from "apis/dataV2/dataV2Api";
import {
    Omega365DynamicDocument,
    Omega365View,
    Omega365ViewField,
    Omega365ViewFieldType,
    RequestedType,
} from "apis/dataV2/omega365Types";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox, TextField } from "components";
import { featuresConfig } from "config/features";
import InfoPopup from "features/deviations/components/infoPopup";
import { selectMainObject } from "features/render";
import { useSceneId } from "hooks/useSceneId";
import { explorerActions } from "slices/explorer";
import { AsyncState, AsyncStatus } from "types/misc";

import DocumentList from "../components/documentList";
import { selectOmega365ConfigDraft, selectSelectedViewId } from "../selectors";
import { omega365Actions } from "../slice";

const EMPTY_ERRORS = {
    title: "",
    viewOrResourceName: "",
    whereClause: "",
    fieldGroup: "",
    fields: [] as string[],
};

export default function ViewEditor() {
    const projectId = useSceneId();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const history = useHistory();
    const mainObject = useAppSelector(selectMainObject);

    const viewId = useParams<{ id?: string }>().id;
    const configDraft = useAppSelector(selectOmega365ConfigDraft)!;
    const selectedViewId = useAppSelector(selectSelectedViewId);
    const views = configDraft.views;
    const [view, setView] = useState<Omega365View>(
        views && viewId
            ? views.find((v) => v.id === viewId)!
            : {
                  id: crypto.randomUUID(),
                  requestedType: RequestedType.View,
                  viewOrResourceName: "",
                  title: "",
                  whereClause: "",
                  fields: [],
              },
    );
    const [preview] = useLazyPreviewOmega365ProjectViewConfigQuery();
    const [previewResult, setPreviewResult] = useState<AsyncState<Omega365DynamicDocument[]>>({
        status: AsyncStatus.Initial,
    });

    const updateView = (upd: Partial<Omega365View>) => {
        setView({ ...view, ...upd });
        setErrors(EMPTY_ERRORS);
        setPreviewResult({ status: AsyncStatus.Initial });
    };

    const [errors, setErrors] = useState(EMPTY_ERRORS);

    const validate = () => {
        return {
            title: view.title.trim() ? "" : "Value is required",
            viewOrResourceName: view.viewOrResourceName.trim() ? "" : "Value is required",
            whereClause: view.whereClause.trim() ? "" : "Value is required",
            fieldGroup: view.fields.length > 0 ? "" : "At least one field is required",
            fields: view.fields.map((field) => {
                let error = "";
                if (!field.title) {
                    error = "Title is empty";
                } else if (!field.name) {
                    error = "Field name is empty";
                } else if (view.fields.find((f) => f.title === field.title) !== field) {
                    error = "There is already field with this title";
                } else if (view.fields.find((f) => f.name === field.name) !== field) {
                    error = "There is already field with this name";
                }
                return error;
            }),
        };
    };

    const hasErrors = (errs: typeof errors) => {
        return (
            errs.title || errs.viewOrResourceName || errs.whereClause || errs.fieldGroup || errs.fields.some((f) => f)
        );
    };

    const handleBack = () => {
        const errors = validate();
        if (hasErrors(errors) && viewId) {
            setErrors(errors);
            return;
        }
        const oldViews = views ?? [];
        const oldView = oldViews.find((v) => v.id === view.id);
        if (oldView !== view && view.title) {
            const cleanedView = {
                ...view,
                fields: view.fields.filter((f) => f.name.trim()),
            };
            const newViews = viewId
                ? oldViews.map((v) => (v.id === view.id ? cleanedView : v))
                : [...oldViews, cleanedView];
            dispatch(omega365Actions.setConfigDraft({ ...configDraft!, views: newViews }));

            if (!newViews.some((v) => v.id === selectedViewId)) {
                dispatch(omega365Actions.setSelectedViewId(newViews.length ? newViews[0].id : null));
            }
        }
        history.goBack();
    };

    const handleGetFromClipboard = async () => {
        const text = await navigator.clipboard.readText();
        if (!text || text.trim() === "") {
            dispatch(omega365Actions.setSnackbarMessage("Clipboard is empty"));
        }
        try {
            const json = JSON.parse(text);
            if (!((json.resourceName || json.viewName) && json.whereClause && json.fields)) {
                dispatch(
                    omega365Actions.setSnackbarMessage(
                        "JSON must have following attributes: resourceName or viewName, whereClause, fields",
                    ),
                );
                return;
            }

            const newView: Omega365View = {
                ...view,
                requestedType: json.resourceName ? RequestedType.Resource : RequestedType.View,
                viewOrResourceName: json.resourceName || json.viewName,
                whereClause: json.whereClause,
                fields: json.fields.map((field: { name: string }) => {
                    return {
                        title: makeFieldTitleFromName(field.name),
                        name: field.name,
                        type: field.name.match(/url$/i) ? Omega365ViewFieldType.Link : Omega365ViewFieldType.Text,
                    };
                }),
            };

            updateView(newView);
        } catch (ex) {
            console.warn(ex);
            dispatch(omega365Actions.setSnackbarMessage("Clipboard should contain valid JSON"));
        }
    };

    const handlePreview = async () => {
        setPreviewResult({ status: AsyncStatus.Initial });

        if (!mainObject) {
            dispatch(omega365Actions.setSnackbarMessage("Select an object for the preview"));
            return;
        }

        const errors = validate();
        if (hasErrors(errors)) {
            setErrors(errors);
            dispatch(omega365Actions.setSnackbarMessage("Fix the validation errors first"));
            return;
        }

        try {
            setPreviewResult({ status: AsyncStatus.Loading });
            const docs = await preview({
                projectId,
                objectId: mainObject,
                baseURL: configDraft.baseURL,
                view,
            }).unwrap();
            setPreviewResult({ status: AsyncStatus.Success, data: docs });
        } catch (ex: unknown) {
            let msg = "Error getting data";
            if (ex && typeof ex === "object" && "data" in ex && ex.data) {
                const data = ex.data as { error: string; errorDetails: string };
                msg = data.errorDetails ?? data.error ?? msg;
            }
            setPreviewResult({ status: AsyncStatus.Error, msg });
        }
    };

    const handleClosePreview = () => {
        setPreviewResult({ status: AsyncStatus.Initial });
    };

    const openProperties = () => {
        dispatch(explorerActions.forceOpenWidget(featuresConfig.properties.key));
    };

    return (
        <>
            {/* Header */}
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex">
                    <Button type="button" onClick={handleBack} color="grey">
                        <ArrowBack sx={{ mr: 1 }} />
                        Back
                    </Button>
                    <Box flex="auto" />
                    {previewResult.status === AsyncStatus.Success ? (
                        <Button type="button" form="omega-view-form" color="grey" onClick={handleClosePreview}>
                            Exit preview
                        </Button>
                    ) : (
                        <>
                            <Button type="button" color="grey" onClick={handleGetFromClipboard}>
                                Get from clipboard
                            </Button>
                            <Button type="button" form="omega-view-form" color="grey" onClick={handlePreview}>
                                Preview
                            </Button>
                        </>
                    )}
                </Box>
            </Box>

            {previewResult.status === AsyncStatus.Loading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : null}

            {/* Content */}
            <ScrollBox width={1} px={1} mt={1} display="flex" flexDirection="column" height={1} pb={2}>
                {previewResult.status === AsyncStatus.Success ? (
                    <DocumentList view={view} documents={previewResult.data} />
                ) : (
                    <>
                        <Stack mt={2} spacing={2}>
                            {previewResult.status === AsyncStatus.Error ? (
                                <Alert severity="warning" onClose={handleClosePreview}>
                                    {previewResult.msg}
                                </Alert>
                            ) : null}
                            <TextField
                                value={view.title}
                                onChange={(e) => updateView({ title: e.target.value })}
                                label="Title"
                                fullWidth
                                required
                                error={Boolean(errors.title)}
                                helperText={errors.title}
                                autoFocus
                            />
                            <Box>
                                <RadioGroup
                                    row
                                    value={view.requestedType}
                                    onChange={(e) => {
                                        updateView({
                                            requestedType: e.target.value as RequestedType,
                                        });
                                    }}
                                    sx={{ ml: 2 }}
                                >
                                    <FormControlLabel value={RequestedType.View} control={<Radio />} label="View" />
                                    <FormControlLabel
                                        value={RequestedType.Resource}
                                        control={<Radio />}
                                        label="Resource"
                                    />
                                </RadioGroup>
                            </Box>
                            <TextField
                                value={view.viewOrResourceName}
                                onChange={(e) => updateView({ viewOrResourceName: e.target.value })}
                                label={view.requestedType === RequestedType.View ? "View" : "Resource"}
                                fullWidth
                                required
                                error={Boolean(errors.viewOrResourceName)}
                                helperText={errors.viewOrResourceName}
                            />
                            <TextField
                                value={view.whereClause}
                                onChange={(e) => updateView({ whereClause: e.target.value })}
                                label="Where"
                                fullWidth
                                required
                                error={Boolean(errors.whereClause)}
                                helperText={errors.whereClause}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <InfoPopup
                                                buttonProps={{ edge: "end" }}
                                                popoverProps={{
                                                    anchorOrigin: { vertical: "bottom", horizontal: "right" },
                                                    transformOrigin: { horizontal: "right", vertical: "top" },
                                                }}
                                            >
                                                <Box p={1} maxWidth={600}>
                                                    <Box>
                                                        Enter request where clause. You can use selected object property
                                                        values wrapping them into <code>{"{{"}</code> and{" "}
                                                        <code>{"}}"}</code>. Property name can be copied from{" "}
                                                        <Button onClick={openProperties}>Properties</Button>
                                                        widget.
                                                    </Box>
                                                    <Typography mt={1} fontWeight={600}>
                                                        Example
                                                    </Typography>
                                                    <code>{`ObjectName = '{{Objectinfo/Object code}}'`}</code>
                                                    <br />
                                                    <Box mt={1}>
                                                        Value of the selected object property{" "}
                                                        <code>Objectinfo/Object code</code> will be subsituted into the
                                                        where clause.
                                                    </Box>
                                                    <Box>
                                                        If object doesn't have any of the used properties - no
                                                        associated documents will be returned.
                                                    </Box>
                                                </Box>
                                            </InfoPopup>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <FormControl fullWidth size="small">
                                <InputLabel id="demo-simple-select-label">Group by field</InputLabel>
                                <Select
                                    labelId="demo-simple-select-label"
                                    value={view.groupBy ?? ""}
                                    label="Group by field"
                                    onChange={(e) => updateView({ groupBy: e.target.value as string })}
                                >
                                    <MenuItem value="">Don't group</MenuItem>
                                    {view.fields
                                        .filter((f) => f.name && f.title)
                                        .map((field, i) => (
                                            <MenuItem key={i} value={field.name}>
                                                {field.title}
                                            </MenuItem>
                                        ))}
                                </Select>
                            </FormControl>
                        </Stack>
                        <FieldList
                            fields={view.fields}
                            errors={errors.fields}
                            groupError={errors.fieldGroup}
                            onChange={(fields) => {
                                const groupBy =
                                    view.groupBy && fields.some((f) => f.name === view.groupBy)
                                        ? view.groupBy
                                        : undefined;
                                updateView({ fields, groupBy });
                            }}
                        />
                    </>
                )}
            </ScrollBox>
        </>
    );
}

function FieldList({
    fields,
    errors,
    groupError,
    onChange,
}: {
    fields: Omega365ViewField[];
    errors: string[];
    groupError: string;
    onChange: (fields: Omega365ViewField[]) => void;
}) {
    const [currentIndex, setCurrentIndex] = useState<number | null>(null);

    const onClose = () => {
        setCurrentIndex(null);
    };

    const handleMoveUp = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        onChange(
            fields.map((f, i) => {
                if (i === index) {
                    return fields[index - 1];
                } else if (i === index - 1) {
                    return fields[index];
                } else {
                    return f;
                }
            }),
        );
    };

    const handleMoveDown = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        onChange(
            fields.map((f, i) => {
                if (i === index) {
                    return fields[index + 1];
                } else if (i === index + 1) {
                    return fields[index];
                } else {
                    return f;
                }
            }),
        );
    };

    return (
        <>
            <Box mt={2}>
                <Box display="flex" alignItems="center" gap={1} ml={2}>
                    <Typography fontWeight={600}>Fields</Typography>
                    <Button
                        color="grey"
                        onClick={async () => {
                            onChange([{ title: "", name: "", type: Omega365ViewFieldType.Text }, ...fields]);
                            setCurrentIndex(0);
                        }}
                    >
                        <AddCircle sx={{ mr: 1 }} />
                        Add
                    </Button>
                </Box>
                {groupError ? <Typography color="error">{groupError}</Typography> : null}
            </Box>

            <List>
                {fields.map((field, index) => {
                    const error = errors[index];

                    if (index === currentIndex) {
                        return (
                            <FieldEditor
                                key={index}
                                field={field}
                                onChange={(field) => onChange(fields.with(currentIndex, field))}
                                onClose={onClose}
                            />
                        );
                    }

                    return (
                        <ListItemButton key={index} onClick={() => setCurrentIndex(index)}>
                            <ListItemText
                                primary={field.title}
                                secondary={
                                    <>
                                        Field: {field.name}
                                        {error ? <Typography color="error">{error}</Typography> : null}
                                    </>
                                }
                            />
                            <Box flex="0 0 auto">
                                <IconButton size="small" onClick={(e) => handleMoveUp(e, index)} disabled={index === 0}>
                                    <ArrowUpward />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={(e) => handleMoveDown(e, index)}
                                    disabled={index === fields.length - 1}
                                >
                                    <ArrowDownward />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onChange(fields.filter((f) => f !== field));
                                    }}
                                >
                                    <Delete />
                                </IconButton>
                            </Box>
                        </ListItemButton>
                    );
                })}
            </List>
        </>
    );
}

function FieldEditor({
    field,
    onChange,
    onClose,
}: {
    field: Omega365ViewField;
    onChange: (field: Omega365ViewField) => void;
    onClose: () => void;
}) {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handler);
        return () => {
            window.removeEventListener("keydown", handler);
        };
    }, [onClose]);

    return (
        <form
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }}
        >
            <Stack spacing={1} px={4} py={2}>
                <TextField
                    value={field.title}
                    onChange={(e) => onChange({ ...field, title: e.target.value })}
                    label="Title"
                    fullWidth
                    autoFocus
                />
                <TextField
                    value={field.name}
                    onChange={(e) => onChange({ ...field, name: e.target.value })}
                    onBlur={() => {
                        if (field.name && !field.title) {
                            onChange({ ...field, title: makeFieldTitleFromName(field.name) });
                        }
                    }}
                    label="Field name"
                    fullWidth
                />
                <Box display="flex" justifyContent="space-between">
                    <FormControl>
                        <RadioGroup
                            row
                            value={field.type}
                            onChange={(e) => {
                                onChange({ ...field, type: e.target.value as Omega365ViewFieldType });
                            }}
                        >
                            <FormControlLabel value={Omega365ViewFieldType.Text} control={<Radio />} label="Text" />
                            <FormControlLabel value={Omega365ViewFieldType.Link} control={<Radio />} label="Link" />
                            <FormControlLabel value={Omega365ViewFieldType.File} control={<Radio />} label="File" />
                        </RadioGroup>
                    </FormControl>
                    <IconButton type="submit">
                        <CheckCircle />
                    </IconButton>
                </Box>
            </Stack>
        </form>
    );
}

function makeFieldTitleFromName(name: string) {
    return name
        .replace(/url$/i, "")
        .replace(/_/g, " ")
        .replace(/([a-z0-9])([A-Z])/g, (m) => `${m[0]} ${m[1]}`);
}
