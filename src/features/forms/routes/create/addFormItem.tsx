import { Close, Delete } from "@mui/icons-material";
import {
    Alert,
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Chip,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    IconButton,
    InputLabel,
    List,
    ListItem,
    ListItemText,
    MenuItem,
    Select,
    Snackbar,
    Typography,
} from "@mui/material";
import { DatePicker, DateTimePicker, TimePicker } from "@mui/x-date-pickers";
import { ChangeEvent, type FormEventHandler, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { Divider, ScrollBox, TextArea, TextField } from "components";
import AddFilesButton from "features/forms/addFilesButton";
import { useUploadFilesMutation } from "features/forms/api";
import { FILE_SIZE_LIMIT } from "features/forms/constants";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";

import {
    DateTimeItem,
    type FormFileUploadResponse,
    type FormItem,
    FormItemType,
    type FormsFile,
    ItemWithOptions,
    TemplateType,
} from "../../types";

const DOC_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

const today = new Date();

export function AddFormItem({
    onSave,
    item,
    templateType,
}: {
    templateType: TemplateType;
    onSave: (item: FormItem) => void;
    item?: FormItem;
}) {
    const { t } = useTranslation();
    const sceneId = useSceneId();
    const history = useHistory();

    const [title, setTitle] = useState(item?.title ?? "");
    const [type, setType] = useState(item?.type || FormItemType.Checkbox);
    const [value, setValue] = useState(item?.type === FormItemType.Text ? (item.value as string[])[0] : "");
    const [required, toggleRequired] = useToggle(item?.required ?? true);
    const [options, setOptions] = useState<string[]>((item as ItemWithOptions)?.options ?? []);
    const [files, setFiles] = useState<FormsFile[]>(item?.type === FormItemType.File ? (item.value ?? []) : []);
    const [fileTypes, setFileTypes] = useState<string[]>(
        item?.type === FormItemType.File
            ? (item?.accept
                  ?.split(",")
                  .reduce(
                      (types, type) =>
                          type === "image/*"
                              ? [...types, t("images")]
                              : type === "application/pdf"
                                ? [...types, t("documents")]
                                : types,
                      [] as string[],
                  ) ?? [])
            : [],
    );
    const [dateTime, setDateTime] = useState<Date | null>(
        item?.type
            ? [FormItemType.Date, FormItemType.Time, FormItemType.DateTime].includes(item.type)
                ? ((item as DateTimeItem).value ?? null)
                : null
            : null,
    );
    const [multiple, toggleMultiple] = useToggle(item?.type === FormItemType.File ? (item?.multiple ?? true) : true);
    const [readonly, toggleReadonly] = useToggle(item?.type === FormItemType.File ? (item?.readonly ?? false) : false);

    const [fileSizeWarning, toggleFileSizeWarning] = useToggle(false);

    const [syncWithProperty, toggleSyncWithProperty] = useToggle(false);
    const [property, setProperty] = useState<string>("");

    const [uploadFiles, { isLoading: uploading }] = useUploadFilesMutation();

    const accept = useMemo(() => {
        let mimeTypes = fileTypes.includes(t("images")) ? "image/*," : "";
        if (fileTypes.includes(t("documents"))) {
            mimeTypes += DOC_TYPES.join(",");
        }
        return mimeTypes;
    }, [fileTypes, t]);

    const canSave = useMemo(() => {
        if (title.trim().length === 0) {
            return false;
        }

        switch (type) {
            case FormItemType.YesNo:
            case FormItemType.TrafficLight:
            case FormItemType.Date:
            case FormItemType.Time:
            case FormItemType.DateTime:
                return true;

            case FormItemType.Checkbox:
            case FormItemType.Dropdown:
                return options.length > 0;

            case FormItemType.Input:
                return syncWithProperty ? Boolean(property.trim()) : true;

            case FormItemType.Text:
                return syncWithProperty ? Boolean(property.trim()) : value.trim().length > 0;

            case FormItemType.File:
                return !readonly || files.length > 0;

            default:
                return false;
        }
    }, [title, type, options.length, value, syncWithProperty, property, readonly, files.length]);

    const handleSubmit = useCallback<FormEventHandler>(
        async (e) => {
            e.preventDefault();

            if (!canSave) {
                return;
            }

            if (FormItemType.File && files.length) {
                const result = await uploadFiles({ projectId: sceneId, files, template: true });
                if ("data" in result) {
                    files.forEach((file) => {
                        file.checksum = (result.data[file.name] as FormFileUploadResponse)?.checksum;
                        file.url = (result.data[file.name] as FormFileUploadResponse)?.url;
                    });
                }
            }

            const newItem: FormItem = {
                id: item?.id ?? window.crypto.randomUUID(),
                title,
                type,
                value:
                    type === FormItemType.Text
                        ? [value]
                        : type === FormItemType.File
                          ? files
                          : [FormItemType.Date, FormItemType.Time, FormItemType.DateTime].includes(type) && dateTime
                            ? dateTime
                            : undefined,
                required: type !== FormItemType.Text && required,
                ...(type === FormItemType.Checkbox || type === FormItemType.Dropdown ? { options } : {}),
                ...(type === FormItemType.File && { accept, multiple, readonly }),
                ...(syncWithProperty && property ? { property: { name: property } } : {}),
            } as FormItem;

            onSave(newItem);
            history.goBack();
        },
        [
            canSave,
            files,
            item?.id,
            title,
            type,
            value,
            dateTime,
            required,
            options,
            accept,
            multiple,
            readonly,
            syncWithProperty,
            property,
            onSave,
            history,
            uploadFiles,
            sceneId,
        ],
    );

    const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value), []);
    const handleToggleRequired = useCallback(
        (_: React.ChangeEvent<HTMLInputElement>) => toggleRequired(),
        [toggleRequired],
    );
    const handleOptionsChange = useCallback((_: React.SyntheticEvent, value: string[]) => setOptions(value), []);
    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value), []);
    const handleToggleMultiple = useCallback(
        (_: React.ChangeEvent<HTMLInputElement>) => toggleMultiple(),
        [toggleMultiple],
    );
    const handleToggleReadonly = useCallback(
        (_: React.ChangeEvent<HTMLInputElement>) => toggleReadonly(),
        [toggleReadonly],
    );

    const handleFilesChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) {
            return;
        }
        let showFileSizeWarning = false;
        setFiles((prevFiles) => {
            const existingFiles = new Set(prevFiles.map((file) => file.name));
            const newFiles = Array.from(files).filter((file) => {
                if (file.size > FILE_SIZE_LIMIT * 1024 * 1024) {
                    showFileSizeWarning = true;
                    return false;
                }
                return !existingFiles.has(file.name);
            });
            return [...prevFiles, ...newFiles];
        });

        toggleFileSizeWarning(showFileSizeWarning);
    };

    const handleRemoveFile = (file: File) => {
        setFiles((prevFiles) => prevFiles.filter((f) => f.name !== file.name));
    };

    const renderAlert = (type: FormItemType) =>
        [FormItemType.Text, FormItemType.File].includes(type) && (
            <Alert severity={type === FormItemType.File ? "warning" : "info"} sx={{ mt: 1 }}>
                {t(type === FormItemType.File ? "betaItem" : "textItemIsImmutableMessage")}
            </Alert>
        );

    return (
        <ScrollBox p={1} pt={2} pb={3} mb={1} component="form" onSubmit={handleSubmit}>
            <Typography fontWeight={600} mb={1}>
                {t("formItem")}
            </Typography>
            <TextField label="Title" value={title} onChange={handleTitleChange} fullWidth />
            <Divider sx={{ my: 1 }} />
            <FormGroup>
                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={type !== FormItemType.Text && required}
                            disabled={type === FormItemType.Text}
                            onChange={handleToggleRequired}
                        />
                    }
                    label={t("alwaysRelevant")}
                />
            </FormGroup>
            <Divider sx={{ my: 1 }} />
            <FormControl fullWidth sx={{ mb: 1 }}>
                <FormLabel sx={{ fontWeight: 600, color: "text.primary", mb: 1 }} id="form-item-type">
                    {t("type")}
                </FormLabel>
                <Select
                    id="form-item-type"
                    value={type}
                    onChange={(e) => setType(e.target.value as FormItemType)}
                    size="small"
                    fullWidth
                >
                    <MenuItem value={FormItemType.Checkbox}>{t("checkbox")}</MenuItem>
                    <MenuItem value={FormItemType.Date}>{t("date")}</MenuItem>
                    <MenuItem value={FormItemType.DateTime}>{t("dateAndTime")}</MenuItem>
                    <MenuItem value={FormItemType.Dropdown}>{t("dropdown")}</MenuItem>
                    <MenuItem value={FormItemType.File}>{t("file")}</MenuItem>
                    <MenuItem value={FormItemType.Input}>{t("input")}</MenuItem>
                    <MenuItem value={FormItemType.Text}>{t("textOrURL")}</MenuItem>
                    <MenuItem value={FormItemType.Time}>{t("time")}</MenuItem>
                    <MenuItem value={FormItemType.TrafficLight}>{t("trafficLight")}</MenuItem>
                    <MenuItem value={FormItemType.YesNo}>{t("yesNo")}</MenuItem>
                </Select>
                {renderAlert(type)}
            </FormControl>
            {[FormItemType.Checkbox, FormItemType.Dropdown].includes(type) && (
                <>
                    <Divider sx={{ mb: 2 }} />
                    <Autocomplete
                        multiple
                        size="small"
                        id="type-options"
                        options={[]}
                        value={options}
                        onChange={handleOptionsChange}
                        freeSolo
                        renderTags={(_value, getTagProps) =>
                            options.map((option: string, index: number) => (
                                <Chip variant="outlined" label={option} {...getTagProps({ index })} size="small" />
                            ))
                        }
                        renderInput={(params) => <TextField {...params} label="Options" />}
                    />
                </>
            )}
            {type === FormItemType.Input && (
                <>
                    <Divider />
                    {templateType === TemplateType.Search && (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={syncWithProperty}
                                    onChange={(e) => {
                                        setValue("");
                                        if (!e.target.checked) {
                                            setProperty("");
                                        }
                                        toggleSyncWithProperty();
                                    }}
                                />
                            }
                            label={t("syncWithProperty")}
                        />
                    )}
                    {syncWithProperty && (
                        <TextField
                            label={t("propertyName")}
                            value={property}
                            onChange={(e) => setProperty(e.target.value)}
                            fullWidth
                        />
                    )}
                </>
            )}
            {type === FormItemType.Text && (
                <>
                    <Divider />
                    {templateType === TemplateType.Search && (
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={syncWithProperty}
                                    onChange={(e) => {
                                        setValue("");
                                        if (!e.target.checked) {
                                            setProperty("");
                                        }
                                        toggleSyncWithProperty();
                                    }}
                                />
                            }
                            label={t("syncWithProperty")}
                        />
                    )}
                    {syncWithProperty ? (
                        <TextField
                            label={t("propertyName")}
                            value={property}
                            onChange={(e) => setProperty(e.target.value)}
                            fullWidth
                        />
                    ) : (
                        <>
                            <Divider sx={{ mb: 2 }} />
                            <TextArea
                                minRows={3}
                                placeholder={t("additionalInfoOrUrl")}
                                style={{ width: "100%" }}
                                value={value}
                                onChange={handleTextChange}
                            />
                        </>
                    )}
                </>
            )}
            {type === FormItemType.File && (
                <>
                    <Divider sx={{ mb: 2 }} />
                    <FormControl size="small" sx={{ width: 1, mb: 1 }}>
                        <InputLabel id="forms-files-accept-label">{t("acceptFileTypes")}</InputLabel>
                        <Select
                            labelId="forms-files-accept-label"
                            id="forms-files-accept"
                            fullWidth
                            multiple
                            value={fileTypes}
                            onChange={(e) => setFileTypes(e.target.value as string[])}
                            name="accept"
                            label={t("acceptFileTypes")}
                        >
                            {[t("documents"), t("images")].map((fileType) => (
                                <MenuItem
                                    key={fileType}
                                    value={fileType}
                                    sx={{
                                        fontWeight: (fileTypes as string[]).includes(fileType) ? "bold" : "regular",
                                    }}
                                >
                                    {fileType}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormGroup>
                        <FormControlLabel
                            control={<Checkbox size="small" checked={multiple} onChange={handleToggleMultiple} />}
                            label={t("selectMultipleFiles")}
                        />
                        <FormControlLabel
                            control={<Checkbox size="small" checked={!readonly} onChange={handleToggleReadonly} />}
                            label={t("allowChangingFiles")}
                            sx={{ mb: 1 }}
                        />
                        <AddFilesButton
                            accept={accept}
                            multiple={multiple}
                            onChange={handleFilesChange}
                            uploading={uploading}
                        />
                    </FormGroup>
                    <List
                        dense
                        sx={{
                            width: "100%",
                            bgcolor: "background.paper",
                            position: "relative",
                            overflow: "auto",
                            mb: 1,
                        }}
                    >
                        {files.map((file) => (
                            <ListItem
                                key={file.name}
                                secondaryAction={
                                    <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFile(file)}>
                                        <Delete />
                                    </IconButton>
                                }
                            >
                                <ListItemText primary={file.name} />
                            </ListItem>
                        ))}
                    </List>
                </>
            )}
            {[FormItemType.Date, FormItemType.Time, FormItemType.DateTime].includes(type) && (
                <>
                    <Divider />
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={!!dateTime}
                                onChange={(e) => setDateTime(e.target.checked ? today : null)}
                            />
                        }
                        label={t("setDefaultValue")}
                    />
                    {dateTime && (
                        <>
                            {type === FormItemType.Date && (
                                <DatePicker
                                    value={dateTime}
                                    minDate={today}
                                    onChange={setDateTime}
                                    slotProps={{
                                        textField: {
                                            size: "small",
                                            fullWidth: true,
                                        },
                                    }}
                                />
                            )}
                            {type === FormItemType.Time && (
                                <TimePicker
                                    value={dateTime}
                                    onChange={setDateTime}
                                    slotProps={{
                                        textField: {
                                            size: "small",
                                            fullWidth: true,
                                        },
                                    }}
                                />
                            )}
                            {type === FormItemType.DateTime && (
                                <DateTimePicker
                                    value={dateTime}
                                    minDate={today}
                                    onChange={setDateTime}
                                    slotProps={{
                                        textField: {
                                            size: "small",
                                            fullWidth: true,
                                        },
                                    }}
                                />
                            )}
                        </>
                    )}
                </>
            )}
            <Snackbar
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                sx={{
                    width: { xs: "auto", sm: 350 },
                    bottom: { xs: "auto", sm: 24 },
                    top: { xs: 24, sm: "auto" },
                }}
                autoHideDuration={2500}
                open={fileSizeWarning}
                onClose={() => toggleFileSizeWarning(false)}
                message={t("filesNotAddedMessage", { limit: FILE_SIZE_LIMIT })}
                action={
                    <IconButton
                        size="small"
                        aria-label="close"
                        color="inherit"
                        onClick={() => toggleFileSizeWarning(false)}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                }
            />
            <Box display="flex" justifyContent="space-between" mt={2}>
                <Button variant="outlined" color="grey" sx={{ mr: 2 }} fullWidth onClick={history.goBack}>
                    {t("cancel")}
                </Button>
                <Button variant="contained" color="primary" fullWidth disabled={!canSave} type="submit">
                    {t("saveItem")}
                </Button>
            </Box>
        </ScrollBox>
    );
}
