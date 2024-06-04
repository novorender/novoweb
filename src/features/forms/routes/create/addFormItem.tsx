import { Delete, InfoOutlined } from "@mui/icons-material";
import {
    Autocomplete,
    Box,
    Button,
    ButtonGroup,
    Checkbox,
    Chip,
    CircularProgress,
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
    Radio,
    RadioGroup,
    Select,
    Typography,
} from "@mui/material";
import {
    ChangeEvent,
    DragEventHandler,
    FormEventHandler,
    MouseEventHandler,
    useCallback,
    useMemo,
    useRef,
    useState,
} from "react";
import { useHistory } from "react-router-dom";

import { Divider, ScrollBox, TextArea, TextField, Tooltip } from "components";
import { useUploadFilesMutation } from "features/forms/api";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";

import { type FileTypes, type FormItem, FormItemType } from "../../types";

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
    const [files, setFiles] = useState<(File & { checksum?: string })[]>([]);
    const [fileTypes, setFileTypes] = useState<FileTypes>([]);
    const [multiple, toggleMultiple] = useToggle(true);
    const [readonly, toggleReadonly] = useToggle(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [uploadFiles, { isLoading: areFilesUploading }] = useUploadFilesMutation();

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
                    files.forEach((file) => (file.checksum = result.data[file.name]));
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
    const handleTypeChange = useCallback(
        (_: React.ChangeEvent<HTMLInputElement>, value: string) => setType(value as FormItemType),
        []
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

    const handleDragOver: DragEventHandler = (e) => {
        e.preventDefault();
    };

    const handleFileDrop: DragEventHandler = (e) => {
        e.preventDefault();
    };

    const handleFilesChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || !files.length) {
            return;
        }
        setFiles((prevFiles) => [...prevFiles, ...files]);
    };

    const handleAddFilesClick: MouseEventHandler = () => fileInputRef.current?.click();

    const handleRemoveFile = (file: File) => {
        setFiles((prevFiles) => prevFiles.filter((f) => f.name !== file.name));
    };

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
            <FormControl sx={{ mb: 1 }}>
                <FormLabel sx={{ fontWeight: 600, color: "text.primary" }} id="form-item-type">
                    Type
                </FormLabel>
                <RadioGroup
                    value={type}
                    onChange={handleTypeChange}
                    row
                    aria-labelledby="form-item-type"
                    name="form-item-types"
                >
                    <FormControlLabel value={FormItemType.Checkbox} control={<Radio size="small" />} label="Checkbox" />
                    <FormControlLabel value={FormItemType.YesNo} control={<Radio size="small" />} label="Yes/No" />
                    <FormControlLabel
                        value={FormItemType.TrafficLight}
                        control={<Radio size="small" />}
                        label="Traffic light"
                    />
                    <FormControlLabel value={FormItemType.Dropdown} control={<Radio size="small" />} label="Dropdown" />
                    <FormControlLabel value={FormItemType.Input} control={<Radio size="small" />} label="Input" />
                    <FormControlLabel
                        value={FormItemType.Text}
                        control={<Radio size="small" />}
                        label={
                            <>
                                Text or URL
                                <Tooltip
                                    title={
                                        'This is an immutable item. It will not be editable or clearable when filling the form. If you require an item that can be modified, please use the "Input" item instead.'
                                    }
                                    enterDelay={0}
                                >
                                    <IconButton
                                        onClick={(evt) => {
                                            evt.stopPropagation();
                                        }}
                                    >
                                        <InfoOutlined />
                                    </IconButton>
                                </Tooltip>
                            </>
                        }
                    />
                    <FormControlLabel value={FormItemType.File} control={<Radio size="small" />} label="File" />
                </RadioGroup>
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
                        <Box display="flex" onDragOver={handleDragOver} onDrop={handleFileDrop}>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFilesChange}
                                accept={accept}
                                multiple={multiple}
                                hidden
                            />
                            <ButtonGroup variant="contained" disabled={areFilesUploading}>
                                <Button onClick={handleAddFilesClick}>
                                    {areFilesUploading ? (
                                        <CircularProgress size={24} />
                                    ) : (
                                        `Add File${multiple ? "s" : ""}`
                                    )}
                                </Button>
                            </ButtonGroup>
                        </Box>
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
