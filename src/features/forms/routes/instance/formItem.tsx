import { Close, NotInterested, OpenInNew } from "@mui/icons-material";
import {
    Box,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    IconButton,
    Link,
    MenuItem,
    OutlinedInput,
    Radio,
    RadioGroup,
    Select,
    Snackbar,
    Typography,
    useTheme,
} from "@mui/material";
import {
    ChangeEvent,
    type Dispatch,
    FormEvent,
    type MouseEvent,
    type SetStateAction,
    useCallback,
    useState,
} from "react";
import { FixedSizeList } from "react-window";

import { Confirmation, ImgModal, withCustomScrollbar } from "components";
import AddFilesButton from "features/forms/addFilesButton";
import { useUploadFilesMutation } from "features/forms/api";
import { FILE_SIZE_LIMIT } from "features/forms/constants";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";

import {
    type FileItem as FileItemType,
    type FormFileUploadResponce,
    type FormItem,
    FormItemType,
    type FormsFile,
} from "../../types";
import FileItem from "./formItems/fileItem";

// Based on https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/debug/browser/linkDetector.ts
function mapLinks(text?: string[] | null) {
    if (!text) {
        return null;
    }

    const CONTROL_CODES = "\\u0000-\\u0020\\u007f-\\u009f";
    const URL_REGEX = new RegExp(
        "(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\\/\\/|data:|www\\.)[^\\s" +
            CONTROL_CODES +
            '"]{2,}[^\\s' +
            CONTROL_CODES +
            "\"')}\\],:;.!?]",
        "ug"
    );

    const result = [] as (string | JSX.Element)[];

    const split = (text: string, regexIndex: number) => {
        if (regexIndex >= 1) {
            result.push(text);
            return;
        }
        let currentIndex = 0;
        let match;
        URL_REGEX.lastIndex = 0;
        while ((match = URL_REGEX.exec(text)) !== null) {
            const stringBeforeMatch = text.substring(currentIndex, match.index);
            if (stringBeforeMatch) {
                split(stringBeforeMatch, regexIndex + 1);
            }
            const linkText = match[0];
            const href =
                linkText.startsWith("http://") || linkText.startsWith("https://") ? linkText : `http://${linkText}`;
            result.push(
                <Link href={href} target="_blank" rel="noopener noreferrer" key={href}>
                    {linkText}
                    <OpenInNew fontSize="small" style={{ marginLeft: "5px" }} />
                </Link>
            );
            currentIndex = match.index + linkText.length;
        }
        const stringAfterMatches = text.substring(currentIndex);
        if (stringAfterMatches) {
            split(stringAfterMatches, regexIndex + 1);
        }
    };

    split(text[0], 0);

    return result;
}

const StyledFixedSizeList = withCustomScrollbar(FixedSizeList) as typeof FixedSizeList;

const FormItemHeader = ({ item, toggleRelevant }: { item: FormItem; toggleRelevant?: () => void }) => (
    <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
        <FormLabel component="legend" sx={{ fontWeight: 600, color: "text.primary" }}>
            {item.title}
        </FormLabel>
        {!item.required && typeof toggleRelevant === "function" && (
            <IconButton size="small" color={item.relevant ? "secondary" : "primary"} onClick={toggleRelevant}>
                <NotInterested fontSize="small" />
            </IconButton>
        )}
    </Box>
);

export function FormItem({ item, setItems }: { item: FormItem; setItems: Dispatch<SetStateAction<FormItem[]>> }) {
    const sceneId = useSceneId();
    const theme = useTheme();
    const [uploadFiles, { isLoading: uploading }] = useUploadFilesMutation();

    const [modalOpen, toggleModal] = useToggle();
    const [fileSizeWarning, toggleFileSizeWarning] = useToggle(false);
    const [isDeletingFile, setIsDeletingFile] = useState<number | null>(null);
    const [editing, setEditing] = useState(false);
    const [isRelevant, setIsRelevant] = useState(item.required);
    const [activeImage, setActiveImage] = useState("");

    const handleChange = (value: string) => {
        if (!editing) {
            setEditing(true);
        }
        setItems((state) =>
            state.map((_item) =>
                (_item as Exclude<FormItem, FileItemType>) === item
                    ? {
                          ...item,
                          value: value ? [value] : null,
                      }
                    : _item
            )
        );
    };

    const toggleRelevant = () => {
        const relevant = item.required ? true : !isRelevant;
        setIsRelevant(relevant);
        setEditing(relevant);
        setItems((state) =>
            state.map((_item) =>
                _item === item
                    ? {
                          ...item,
                          relevant,
                      }
                    : _item
            )
        );
    };

    const handleTextFieldClick = (event: MouseEvent<HTMLDivElement>) => {
        if (!isRelevant) {
            return;
        }
        if (event.target instanceof HTMLAnchorElement || event.target instanceof SVGElement) {
            // Don't turn on editing mode when the link was clicked
            return;
        }
        setEditing(true);
    };

    const handleTextFieldBlur = () => {
        setEditing(false);
    };

    const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>, itemId: string) => {
        const files: FormsFile[] = Array.from(e.target.files ?? []);
        if (files.length === 0) {
            return;
        }

        let showFileSizeWarning = false;
        const filteredFiles = files.filter((file) => {
            if (file.size > FILE_SIZE_LIMIT * 1024 * 1024) {
                showFileSizeWarning = true;
                return false;
            }
            return true;
        });

        toggleFileSizeWarning(showFileSizeWarning);

        if (filteredFiles.length === 0) {
            return;
        }

        const resp = await uploadFiles({ projectId: sceneId, files: filteredFiles, template: false });
        if ("data" in resp) {
            filteredFiles.forEach((file) => {
                if (resp.data[file.name]) {
                    file.checksum = (resp.data[file.name] as FormFileUploadResponce)?.checksum;
                    file.url = (resp.data[file.name] as FormFileUploadResponce)?.url;
                }
            });
        }

        setItems((state) =>
            state.map((item) => {
                if (item.id === itemId) {
                    return item.type === FormItemType.File
                        ? ({
                              ...item,
                              value: [...(item.value ?? []), ...(filteredFiles as { checksum?: string }[])].filter(
                                  (file, idx, arr) => idx === arr.findIndex((f) => f.checksum === file.checksum)
                              ),
                          } as FileItemType)
                        : item;
                }
                return item;
            })
        );
    };

    const handleRemoveFile = useCallback((item: FileItemType, index: number) => {
        setIsDeletingFile(index);
    }, []);

    const deleteFile = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            if (Number.isInteger(isDeletingFile) && item.type === FormItemType.File) {
                setItems((state) =>
                    state.map((_item) =>
                        _item.id === item.id
                            ? ({
                                  ..._item,
                                  value: (_item.value as FormsFile[]).filter((_, index) => index !== isDeletingFile),
                              } as FileItemType)
                            : _item
                    )
                );
            }
            setIsDeletingFile(null);
        },
        [isDeletingFile, item, setItems]
    );

    const openImageModal = async (url: string = "") => {
        setActiveImage(url);
        toggleModal();
    };

    switch (item.type) {
        case FormItemType.Checkbox:
            return (
                <FormControl disabled={!item.required && !item.relevant} component="fieldset" fullWidth>
                    <FormItemHeader item={item} toggleRelevant={toggleRelevant} />
                    <FormGroup row>
                        {item.options.map((option) => (
                            <FormControlLabel
                                key={option}
                                control={
                                    <Checkbox
                                        checked={Boolean(item.value && item.value.includes(option))}
                                        name={option}
                                    />
                                }
                                onChange={(_e, checked) =>
                                    setItems((state) =>
                                        state.map((_item) =>
                                            _item === item
                                                ? {
                                                      ...item,
                                                      value: checked
                                                          ? [...(item.value || []), option]
                                                          : (item.value || []).filter((value) => value !== option),
                                                  }
                                                : _item
                                        )
                                    )
                                }
                                label={option}
                            />
                        ))}
                    </FormGroup>
                </FormControl>
            );

        case FormItemType.YesNo:
            return (
                <FormControl disabled={!item.required && !item.relevant} component="fieldset" fullWidth>
                    <FormItemHeader item={item} toggleRelevant={toggleRelevant} />
                    <RadioGroup
                        value={item.value ? item.value[0] : ""}
                        onChange={(_e, value) => handleChange(value)}
                        row
                        aria-labelledby={item.id}
                        name={item.title}
                    >
                        <FormControlLabel value={"no"} control={<Radio size="small" />} label="No" />
                        <FormControlLabel value={"yes"} control={<Radio size="small" />} label="Yes" />
                    </RadioGroup>
                </FormControl>
            );

        case FormItemType.TrafficLight:
            return (
                <FormControl disabled={!item.required && !item.relevant} component="fieldset" fullWidth>
                    <FormItemHeader item={item} toggleRelevant={toggleRelevant} />
                    <RadioGroup
                        value={item.value ? item.value[0] : ""}
                        onChange={(_e, value) => handleChange(value)}
                        row
                        aria-labelledby={item.id}
                        name={item.title}
                    >
                        <FormControlLabel value={"red"} control={<Radio size="small" />} label="Red" />
                        <FormControlLabel value={"yellow"} control={<Radio size="small" />} label="Yellow" />
                        <FormControlLabel value={"green"} control={<Radio size="small" />} label="Green" />
                    </RadioGroup>
                </FormControl>
            );

        case FormItemType.Dropdown:
            return (
                <FormControl
                    disabled={!item.required && !item.relevant}
                    component="fieldset"
                    fullWidth
                    size="small"
                    sx={{ pb: 1 }}
                >
                    <FormItemHeader item={item} toggleRelevant={toggleRelevant} />
                    <Select
                        value={item.value ? item.value[0] : ""}
                        onChange={(evt) => handleChange(evt.target.value)}
                        id={item.id}
                    >
                        {item.options.map((option) => (
                            <MenuItem key={option} value={option}>
                                {option}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            );

        case FormItemType.Input:
            return (
                <FormControl
                    disabled={!item.required && !item.relevant && !item.value}
                    component="fieldset"
                    fullWidth
                    size="small"
                    sx={{ pb: 1 }}
                >
                    <FormItemHeader item={item} toggleRelevant={toggleRelevant} />
                    <Box onClick={handleTextFieldClick}>
                        {!editing && (!!item.value || (!item.required && !item.relevant)) ? (
                            <Box>
                                {item.value?.[0].split("\n").map((line, idx) => (
                                    <Box key={item.id! + idx} sx={{ wordWrap: "break-word", overflowWrap: "anywhere" }}>
                                        {mapLinks([line])}
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <OutlinedInput
                                value={item.value ? item.value[0] : ""}
                                onChange={(evt) => handleChange(evt.target.value)}
                                onBlur={handleTextFieldBlur}
                                multiline
                                minRows={3}
                                maxRows={5}
                                sx={{ width: 1, pr: 0 }}
                                id={item.id}
                                autoFocus
                                inputRef={(ref) => {
                                    if (ref) {
                                        ref.selectionStart = item.value?.[0].length ?? 0;
                                    }
                                }}
                            />
                        )}
                    </Box>
                </FormControl>
            );

        case FormItemType.Text:
            return (
                <FormControl component="fieldset" fullWidth size="small" sx={{ pb: 1 }}>
                    <FormItemHeader item={item} />
                    <Box>
                        {item.value?.[0].split("\n").map((line, idx) => (
                            <Box key={item.id! + idx} sx={{ wordWrap: "break-word", overflowWrap: "anywhere" }}>
                                {mapLinks([line])}
                            </Box>
                        ))}
                    </Box>
                </FormControl>
            );

        case FormItemType.File:
            return (
                <FormControl fullWidth>
                    <FormItemHeader item={item} toggleRelevant={toggleRelevant} />
                    {Number.isInteger(isDeletingFile) ? (
                        <Confirmation
                            title={`Delete file "${(item.value as FormsFile[])[isDeletingFile as number].name}"?`}
                            confirmBtnText="Delete"
                            onCancel={() => setIsDeletingFile(null)}
                            component="form"
                            onSubmit={deleteFile}
                            headerShadow={false}
                        />
                    ) : item.value && !!item.value.length ? (
                        <StyledFixedSizeList
                            style={{
                                paddingLeft: theme.spacing(1),
                                paddingRight: theme.spacing(1),
                                marginBottom: theme.spacing(1),
                            }}
                            height={item.value.length * 80}
                            width="100%"
                            itemSize={80}
                            overscanCount={3}
                            itemCount={item.value.length}
                        >
                            {({ index, style }) => (
                                <FileItem
                                    style={style}
                                    file={item.value![index]}
                                    isReadonly={item.readonly || !isRelevant}
                                    activeImage={activeImage}
                                    isModalOpen={modalOpen}
                                    removeFile={() => handleRemoveFile(item, index)}
                                    openImageModal={openImageModal}
                                />
                            )}
                        </StyledFixedSizeList>
                    ) : (
                        <Typography variant="body2" my={1}>
                            No files uploaded.
                        </Typography>
                    )}
                    <AddFilesButton
                        accept={item.accept}
                        multiple={item.multiple}
                        onChange={(e) => handleFileUpload(e, item.id!)}
                        uploading={uploading}
                        disabled={!isRelevant}
                    />
                    <ImgModal src={activeImage ?? ""} open={modalOpen} onClose={() => toggleModal()} anonymous />
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
                </FormControl>
            );

        default:
            return null;
    }
}
