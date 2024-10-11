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
import { useTranslation } from "react-i18next";
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
    const { t } = useTranslation();
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
        views?.find((v) => v.id === viewId) ?? {
            id: crypto.randomUUID(),
            requestedType: RequestedType.View,
            viewOrResourceName: "",
            title: "",
            whereClause: "",
            fields: [],
            groupBy: null,
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
            title: view.title.trim() ? "" : t("valueIsRequired"),
            viewOrResourceName: view.viewOrResourceName.trim() ? "" : t("valueIsRequired"),
            whereClause: view.whereClause.trim() ? "" : t("valueIsRequired"),
            fieldGroup: view.fields.length > 0 ? "" : t("atLeastOneFieldIsRequired"),
            fields: view.fields.map((field) => {
                if (!field.title) {
                    return t("titleIsEmpty");
                }
                if (!field.name) {
                    return t("fieldNameIsEmpty");
                }
                if (view.fields.find((f) => f.title === field.title) !== field) {
                    return t("thereIsAlreadyFieldWithThisTitle");
                }
                if (view.fields.find((f) => f.name === field.name) !== field) {
                    return t("thereIsAlreadyFieldWithThisName");
                }
                return "";
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
            dispatch(omega365Actions.setSnackbarMessage(t("clipboardIsEmpty")));
        }
        try {
            const json = JSON.parse(text);
            if (!((json.resourceName || json.viewName) && json.whereClause && json.fields)) {
                dispatch(omega365Actions.setSnackbarMessage(t("omegaJsonImportMissingAttributesError")));
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
            dispatch(omega365Actions.setSnackbarMessage(t("clipboardShouldContainValidJSON")));
        }
    };

    const handlePreview = async () => {
        setPreviewResult({ status: AsyncStatus.Initial });

        if (!mainObject) {
            dispatch(omega365Actions.setSnackbarMessage(t("selectAnObjectForThePreview")));
            return;
        }

        const errors = validate();
        if (hasErrors(errors)) {
            setErrors(errors);
            dispatch(omega365Actions.setSnackbarMessage(t("fixTheValidationErrorsFirst")));
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
            let msg = t("errorOccurred");
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
                        {t("back")}
                    </Button>
                    <Box flex="auto" />
                    {previewResult.status === AsyncStatus.Success ? (
                        <Button type="button" form="omega-view-form" color="grey" onClick={handleClosePreview}>
                            {t("exitPreview")}
                        </Button>
                    ) : (
                        <>
                            <Button type="button" color="grey" onClick={handleGetFromClipboard}>
                                {t("getFromClipboard")}
                            </Button>
                            <Button type="button" form="omega-view-form" color="grey" onClick={handlePreview}>
                                {t("preview")}
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
                                label={t("title")}
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
                                    <FormControlLabel
                                        value={RequestedType.View}
                                        control={<Radio />}
                                        label={t("view(noun)")}
                                    />
                                    <FormControlLabel
                                        value={RequestedType.Resource}
                                        control={<Radio />}
                                        label={t("resource")}
                                    />
                                </RadioGroup>
                            </Box>
                            <TextField
                                value={view.viewOrResourceName}
                                onChange={(e) => updateView({ viewOrResourceName: e.target.value })}
                                label={t(view.requestedType === RequestedType.View ? "view(noun)" : "resource")}
                                fullWidth
                                required
                                error={Boolean(errors.viewOrResourceName)}
                                helperText={errors.viewOrResourceName}
                            />
                            <TextField
                                value={view.whereClause}
                                onChange={(e) => updateView({ whereClause: e.target.value })}
                                label={t("where")}
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
                                                        {t("enterRequestWhereClause")} <code>{"{{"}</code> and{" "}
                                                        <code>{"}}"}</code>. {t("propertyNameCanBeCopiedFrom")}{" "}
                                                        <Button onClick={openProperties}>{t("properties")}</Button>
                                                    </Box>
                                                    <Typography mt={1} fontWeight={600}>
                                                        {t("example")}
                                                    </Typography>
                                                    <code>{`ObjectName = '{{Objectinfo/Object code}}'`}</code>
                                                    <br />
                                                    <Box mt={1}>
                                                        {t("valueOfTheSelectedObjectProperty")}{" "}
                                                        <code>Objectinfo/Object code</code>{" "}
                                                        {t("willBeSubstitutedIntoTheWhereClause")}.
                                                    </Box>
                                                    <Box>{t("omegaNoAssocDocsReturned")}</Box>
                                                </Box>
                                            </InfoPopup>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <FormControl fullWidth size="small">
                                <InputLabel id="omega-group-by-label">{t("groupByField")}</InputLabel>
                                <Select
                                    labelId="omega-group-by-label"
                                    value={view.groupBy ?? ""}
                                    label={t("groupByField")}
                                    onChange={(e) => updateView({ groupBy: e.target.value as string })}
                                >
                                    <MenuItem value="">{t("dontGroup")}</MenuItem>
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
                                    view.groupBy && fields.some((f) => f.name === view.groupBy) ? view.groupBy : null;
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
    const { t } = useTranslation();
    const [currentIndex, setCurrentIndex] = useState<number | null>(null);

    const onClose = () => {
        setCurrentIndex(null);
    };

    const handleMove = (e: React.MouseEvent, index: number, offset: number) => {
        e.stopPropagation();
        const newFields = fields.slice();
        const item = newFields[index];
        newFields[index] = newFields[index + offset];
        newFields[index + offset] = item;
        onChange(newFields);
    };

    return (
        <>
            <Box mt={2}>
                <Box display="flex" alignItems="center" gap={1} ml={2}>
                    <Typography fontWeight={600}>{t("fields")}</Typography>
                    <Button
                        color="grey"
                        onClick={async () => {
                            onChange([{ title: "", name: "", type: Omega365ViewFieldType.Text }, ...fields]);
                            setCurrentIndex(0);
                        }}
                    >
                        <AddCircle sx={{ mr: 1 }} />
                        {t("add")}
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
                                        {t("field")}: {field.name}
                                        {error ? <Typography color="error">{error}</Typography> : null}
                                    </>
                                }
                            />
                            <Box flex="0 0 auto">
                                <IconButton
                                    size="small"
                                    onClick={(e) => handleMove(e, index, -1)}
                                    disabled={index === 0}
                                >
                                    <ArrowUpward />
                                </IconButton>
                                <IconButton
                                    size="small"
                                    onClick={(e) => handleMove(e, index, 1)}
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
    const { t } = useTranslation();
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
                    label={t("title")}
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
                    label={t("fieldName")}
                    fullWidth
                />
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <FormControl>
                        <RadioGroup
                            row
                            value={field.type}
                            onChange={(e) => {
                                onChange({ ...field, type: e.target.value as Omega365ViewFieldType });
                            }}
                        >
                            <FormControlLabel
                                value={Omega365ViewFieldType.Text}
                                control={<Radio />}
                                label={t("text")}
                            />
                            <FormControlLabel
                                value={Omega365ViewFieldType.Link}
                                control={<Radio />}
                                label={t("link")}
                            />
                            <FormControlLabel
                                value={Omega365ViewFieldType.File}
                                control={<Radio />}
                                label={t("file")}
                            />
                            <FormControlLabel
                                value={Omega365ViewFieldType.Hidden}
                                control={<Radio />}
                                label={t("hidden")}
                            />
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
