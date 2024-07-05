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
import { ChangeEvent, type FormEventHandler, useCallback, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";

import { Divider, ScrollBox, TextArea, TextField } from "components";
import AddFilesButton from "features/forms/addFilesButton";
import { useUploadFilesMutation } from "features/forms/api";
import { FILE_SIZE_LIMIT } from "features/forms/constants";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";

import { type FileTypes, type FormFileUploadResponse, type FormItem, FormItemType } from "../../types";

const DOC_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];

export function AddFormItem({ onSave }: { onSave: (item: FormItem) => void }) {
    const sceneId = useSceneId();
    const history = useHistory();
    const [title, setTitle] = useState("");
    const [value, setValue] = useState("");
    const [type, setType] = useState(FormItemType.Checkbox);
    const [relevant, toggleRelevant] = useToggle(true);
    const [options, setOptions] = useState<string[]>([]);
    const [files, setFiles] = useState<(File & FormFileUploadResponse)[]>([]);
    const [fileTypes, setFileTypes] = useState<FileTypes>([]);
    const [multiple, toggleMultiple] = useToggle(true);
    const [readonly, toggleReadonly] = useToggle(false);
    const [fileSizeWarning, toggleFileSizeWarning] = useToggle(false);

    const [uploadFiles, { isLoading: uploading }] = useUploadFilesMutation();

    const accept = useMemo(() => {
        let mimeTypes = fileTypes.includes("Images") ? "image/*," : "";
        if (fileTypes.includes("Documents")) {
            mimeTypes += DOC_TYPES.join(",");
        }
        return mimeTypes;
    }, [fileTypes]);

    const canSave = useMemo(
        () =>
            title.trim() &&
            ([FormItemType.Input, FormItemType.YesNo, FormItemType.TrafficLight].includes(type) ||
                ([FormItemType.Checkbox, FormItemType.Dropdown].includes(type) && options.length) ||
                (type === FormItemType.Text && value.trim().length) ||
                (type === FormItemType.File && (!readonly || files.length))),
        [title, type, options.length, value, readonly, files.length]
    );

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
                id: window.crypto.randomUUID(),
                title,
                type,
                value: type === FormItemType.Text ? [value] : type === FormItemType.File ? files : undefined,
                required: type !== FormItemType.Text && relevant,
                ...(type === FormItemType.Checkbox || type === FormItemType.Dropdown ? { options } : {}),
                ...(type === FormItemType.File && { accept, multiple, readonly }),
            } as FormItem;

            onSave(newItem);
            history.goBack();
        },
        [
            canSave,
            files,
            title,
            type,
            value,
            relevant,
            options,
            accept,
            multiple,
            readonly,
            onSave,
            history,
            uploadFiles,
            sceneId,
        ]
    );

    const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value), []);
    const handleToggleRelevant = useCallback(
        (_: React.ChangeEvent<HTMLInputElement>) => toggleRelevant(),
        [toggleRelevant]
    );
    const handleOptionsChange = useCallback((_: React.SyntheticEvent, value: string[]) => setOptions(value), []);
    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value), []);
    const handleToggleMultiple = useCallback(
        (_: React.ChangeEvent<HTMLInputElement>) => toggleMultiple(),
        [toggleMultiple]
    );
    const handleToggleReadonly = useCallback(
        (_: React.ChangeEvent<HTMLInputElement>) => toggleReadonly(),
        [toggleReadonly]
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
                {type === FormItemType.File
                    ? "This item type is in BETA."
                    : 'This is an immutable item. It will not be editable or clearable when filling the form. If you require an item that can be modified, please use the "Input" item instead.'}
            </Alert>
        );

    return (
        <ScrollBox p={1} pt={2} pb={3} component="form" onSubmit={handleSubmit}>
            <Typography fontWeight={600} mb={1}>
                Form item
            </Typography>
            <TextField label="Title" value={title} onChange={handleTitleChange} fullWidth />
            <Divider sx={{ my: 1 }} />
            <FormGroup>
                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={type !== FormItemType.Text && relevant}
                            disabled={type === FormItemType.Text}
                            onChange={handleToggleRelevant}
                        />
                    }
                    label="Always relevant"
                />
            </FormGroup>
            <Divider sx={{ my: 1 }} />
            <FormControl fullWidth sx={{ mb: 1 }}>
                <FormLabel sx={{ fontWeight: 600, color: "text.primary", mb: 1 }} id="form-item-type">
                    Type
                </FormLabel>
                <Select id="form-item-type" value={type} onChange={(e) => setType(e.target.value as FormItemType)}>
                    <MenuItem value={FormItemType.Checkbox}>Checkbox</MenuItem>
                    <MenuItem value={FormItemType.YesNo}>Yes/No</MenuItem>
                    <MenuItem value={FormItemType.TrafficLight}>Traffic light</MenuItem>
                    <MenuItem value={FormItemType.Dropdown}>Dropdown</MenuItem>
                    <MenuItem value={FormItemType.Input}>Input</MenuItem>
                    <MenuItem value={FormItemType.Text}>Text or URL</MenuItem>
                    <MenuItem value={FormItemType.File}>File</MenuItem>
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
            {type === FormItemType.Text && (
                <>
                    <Divider sx={{ mb: 2 }} />
                    <TextArea
                        minRows={3}
                        placeholder="Additional information or URL"
                        style={{ width: "100%" }}
                        value={value}
                        onChange={handleTextChange}
                    />
                </>
            )}
            {type === FormItemType.File && (
                <>
                    <Divider sx={{ mb: 2 }} />
                    <FormControl size="small" sx={{ width: 1, mb: 1 }}>
                        <InputLabel id="forms-files-accept-label">Accept file types</InputLabel>
                        <Select
                            labelId="forms-files-accept-label"
                            id="forms-files-accept"
                            fullWidth
                            multiple
                            value={fileTypes}
                            onChange={(e) => setFileTypes(e.target.value as FileTypes)}
                            name="accept"
                            label="Accept file types"
                        >
                            {["Documents", "Images"].map((fileType) => (
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
                            label="Select multiple files"
                        />
                        <FormControlLabel
                            control={<Checkbox size="small" checked={!readonly} onChange={handleToggleReadonly} />}
                            label="Allow changing files"
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
                message={`Some files were not added because they are larger than ${FILE_SIZE_LIMIT} MB.`}
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
                    Cancel
                </Button>
                <Button variant="contained" color="primary" fullWidth disabled={!canSave} type="submit">
                    Save item
                </Button>
            </Box>
        </ScrollBox>
    );
}
