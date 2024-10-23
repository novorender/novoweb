import { Close, Link as LinkIcon, OpenInNew } from "@mui/icons-material";
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
    Stack,
    Typography,
    useTheme,
} from "@mui/material";
import { DatePicker, DateTimePicker, TimePicker } from "@mui/x-date-pickers";
import {
    ChangeEvent,
    type Dispatch,
    FormEvent,
    type MouseEvent,
    type SetStateAction,
    useCallback,
    useEffect,
    useState,
} from "react";
import { useTranslation } from "react-i18next";
import { FixedSizeList } from "react-window";

import { useAppSelector } from "app/redux-store-interactions";
import { Confirmation, ImgModal, Tooltip, withCustomScrollbar } from "components";
import AddFilesButton from "features/forms/addFilesButton";
import { useUploadFilesMutation } from "features/forms/api";
import { FILE_SIZE_LIMIT } from "features/forms/constants";
import { useObjectProperty } from "features/forms/hooks/useObjectProperty";
import { selectForms } from "features/forms/slice";
import { ShareLink } from "features/shareLink";
import { useSceneId } from "hooks/useSceneId";
import { useToggle } from "hooks/useToggle";

import {
    DateTimeItem,
    type FileItem as FileItemType,
    type FormFileUploadResponse,
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
        "ug",
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
                </Link>,
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

const FormItemMessage = ({ open, message, onClose }: { open: boolean; message: string; onClose: () => void }) => (
    <Snackbar
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{
            width: { xs: "auto", sm: 350 },
            bottom: { xs: "auto", sm: 24 },
            top: { xs: 24, sm: "auto" },
        }}
        autoHideDuration={2500}
        open={open}
        onClose={onClose}
        message={message}
        action={
            <IconButton size="small" aria-label="close" color="inherit" onClick={onClose}>
                <Close fontSize="small" />
            </IconButton>
        }
    />
);

const FormItemHeader = ({
    title,
    required,
    id,
    disabled,
    propertyName,
    isSynced,
}: {
    title: string;
    required?: boolean;
    id?: string;
    disabled?: boolean;
    propertyName?: string;
    isSynced?: boolean;
}) => {
    const { t } = useTranslation();
    const forms = useAppSelector(selectForms);
    const currentFormsList = forms.currentFormsList || forms.selectedFormId;
    return (
        <Stack direction="row" spacing={0.5} alignItems="center">
            <FormLabel component="legend" sx={{ fontWeight: 600, color: "text.primary" }}>
                {`${title} ${!required ? `(${t("optional")})` : ""}`}
            </FormLabel>
            {propertyName && (
                <Tooltip title={t("propertySyncStatus", { propertyName, sync: t(isSynced ? "synced" : "sync") })}>
                    <Box>
                        <IconButton onClick={() => {}} disabled={disabled || isSynced}>
                            <LinkIcon color={isSynced ? "success" : "warning"} />
                        </IconButton>
                    </Box>
                </Tooltip>
            )}
            {id && !disabled && (
                <ShareLink
                    variant="primaryMenu"
                    explorerStateOverwrite={{ forms: { ...forms, currentFormsList, formItemId: id } }}
                />
            )}
        </Stack>
    );
};

export function FormItem({
    item,
    setItems,
    disabled,
}: {
    item: FormItem;
    setItems?: Dispatch<SetStateAction<FormItem[]>>;
    disabled?: boolean;
}) {
    const { t } = useTranslation();
    const sceneId = useSceneId();
    const theme = useTheme();
    const [uploadFiles, { isLoading: uploading }] = useUploadFilesMutation();
    const property = useObjectProperty(item.property);
    const isSynced = Boolean(Array.isArray(item.value) && property?.value && item.value?.[0] === property?.value);

    const [modalOpen, toggleModal] = useToggle();
    const [fileIndexToDelete, setFileIndexToDelete] = useState<number | null>(null);
    const [infoMessage, setInfoMessage] = useState<string>("");
    const [editing, setEditing] = useState(false);
    const [activeImage, setActiveImage] = useState("");

    const handleChange = useCallback(
        (
            value: string | string[] | number | Date | null | FormsFile[],
            property?: { name: string; value: string | number },
        ) => {
            if (!editing) {
                setEditing(true);
            }
            setItems?.((state) =>
                state.map((_item) => {
                    if (_item === item) {
                        switch (item.type) {
                            case FormItemType.Date:
                            case FormItemType.Time:
                            case FormItemType.DateTime:
                                return {
                                    ...item,
                                    value: value as Date | null,
                                } as DateTimeItem;
                            case FormItemType.File:
                                return {
                                    ...item,
                                    value: value as FormsFile[],
                                };
                            default:
                                return {
                                    ...item,
                                    property: Object.assign({}, item.property, property),
                                    value: Array.isArray(value) ? value : value ? [value as string] : null,
                                } as FormItem;
                        }
                    }
                    return _item;
                }),
            );
        },
        [editing, item, setItems],
    );

    useEffect(() => {
        if (!property?.value || ![FormItemType.Text].includes(item.type)) {
            return;
        }

        // Automatically sync the item value with the property value
        // if the item value is empty or the same as the previously synced one while property value has changed
        if (
            item.value === null ||
            item.value === undefined ||
            (Array.isArray(item.value) &&
                (item.value.length === 0 ||
                    item.value?.[0] === "" ||
                    (item.value?.[0] === item?.property?.value && item.value?.[0] !== property?.value)))
        ) {
            handleChange(property.value, property);
        }
    }, [handleChange, item, property, property?.value]);

    const handleTextFieldClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target instanceof HTMLAnchorElement || event.target instanceof SVGElement) {
            // Don't turn on editing mode when the link was clicked
            return;
        }
        setEditing(true);
    };

    const handleTextFieldBlur = () => {
        setEditing(false);
    };

    const closeSnackbar = () => setInfoMessage("");

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

        if (showFileSizeWarning) {
            setInfoMessage(t("filesNotAddedMessage", { limit: FILE_SIZE_LIMIT }));
        }

        if (filteredFiles.length === 0) {
            return;
        }

        const resp = await uploadFiles({ projectId: sceneId, files: filteredFiles, template: false });
        if ("data" in resp) {
            filteredFiles.forEach((file) => {
                if (resp.data[file.name]) {
                    file.checksum = (resp.data[file.name] as FormFileUploadResponse)?.checksum;
                    file.url = (resp.data[file.name] as FormFileUploadResponse)?.url;
                }
            });
        } else {
            setInfoMessage(t("filesUploadingError"));
        }

        setItems?.((state) =>
            state.map((item) => {
                if (item.id === itemId) {
                    return item.type === FormItemType.File
                        ? ({
                              ...item,
                              value: [...(item.value ?? []), ...(filteredFiles as { checksum?: string }[])].filter(
                                  (file, idx, arr) => idx === arr.findIndex((f) => f.checksum === file.checksum),
                              ),
                          } as FileItemType)
                        : item;
                }
                return item;
            }),
        );
    };

    const handleRemoveFile = useCallback((index: number) => {
        setFileIndexToDelete(index);
    }, []);

    const deleteFile = useCallback(
        (e: FormEvent) => {
            e.preventDefault();
            if (Number.isInteger(fileIndexToDelete) && item.type === FormItemType.File) {
                setItems?.((state) =>
                    state.map((_item) =>
                        _item.id === item.id
                            ? ({
                                  ..._item,
                                  value: (_item.value as FormsFile[]).filter((_, index) => index !== fileIndexToDelete),
                              } as FileItemType)
                            : _item,
                    ),
                );
            }
            setFileIndexToDelete(null);
        },
        [fileIndexToDelete, item, setItems],
    );

    const openImageModal = (url: string = "") => {
        setActiveImage(url);
        toggleModal();
    };

    switch (item.type) {
        case FormItemType.Checkbox:
            return (
                <FormControl disabled={disabled || item.readonly} component="fieldset" fullWidth>
                    <FormItemHeader title={item.title} required={item.required} id={item.id} disabled={disabled} />
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
                                    setItems?.((state) =>
                                        state.map((_item) =>
                                            _item === item
                                                ? {
                                                      ...item,
                                                      value: checked
                                                          ? [...(item.value || []), option]
                                                          : (item.value || []).filter((value) => value !== option),
                                                  }
                                                : _item,
                                        ),
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
                <FormControl disabled={disabled || item.readonly} component="fieldset" fullWidth>
                    <FormItemHeader title={item.title} required={item.required} id={item.id} disabled={disabled} />
                    <RadioGroup
                        value={item.value ? item.value[0] : ""}
                        onChange={(_e, value) => handleChange(value)}
                        row
                        aria-labelledby={item.id}
                        name={item.title}
                    >
                        <FormControlLabel value={"no"} control={<Radio size="small" />} label={t("no")} />
                        <FormControlLabel value={"yes"} control={<Radio size="small" />} label={t("yes")} />
                    </RadioGroup>
                </FormControl>
            );

        case FormItemType.TrafficLight:
            return (
                <FormControl disabled={disabled || item.readonly} component="fieldset" fullWidth>
                    <FormItemHeader title={item.title} required={item.required} id={item.id} disabled={disabled} />
                    <RadioGroup
                        value={item.value ? item.value[0] : ""}
                        onChange={(_e, value) => handleChange(value)}
                        row
                        aria-labelledby={item.id}
                        name={item.title}
                    >
                        <FormControlLabel value={"red"} control={<Radio size="small" />} label={t("red")} />
                        <FormControlLabel value={"yellow"} control={<Radio size="small" />} label={t("yellow")} />
                        <FormControlLabel value={"green"} control={<Radio size="small" />} label={t("green")} />
                    </RadioGroup>
                </FormControl>
            );

        case FormItemType.Dropdown:
            return (
                <FormControl
                    disabled={disabled || item.readonly}
                    component="fieldset"
                    fullWidth
                    size="small"
                    sx={{ pb: 1 }}
                >
                    <FormItemHeader title={item.title} required={item.required} id={item.id} disabled={disabled} />
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
                    disabled={disabled || item.readonly}
                    component="fieldset"
                    fullWidth
                    size="small"
                    sx={{ pb: 1 }}
                >
                    <FormItemHeader title={item.title} required={item.required} id={item.id} disabled={disabled} />
                    <Box onClick={handleTextFieldClick}>
                        {!editing && Boolean(item.value) ? (
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
                                autoFocus={Boolean(item.value?.length)}
                                inputProps={{
                                    // Reset the value in order to place the cursor at the end of the text
                                    // instead of the beginning
                                    onFocus: (e) => {
                                        const val = e.target.value;
                                        e.target.value = "";
                                        e.target.value = val;
                                    },
                                }}
                            />
                        )}
                    </Box>
                </FormControl>
            );

        case FormItemType.Text:
            return (
                <FormControl component="fieldset" fullWidth size="small" sx={{ pb: 1 }}>
                    <FormItemHeader
                        title={item.title}
                        required={item.required}
                        id={item.id}
                        disabled={disabled}
                        propertyName={property?.name}
                        isSynced={isSynced}
                    />
                    <Box>
                        {item.value?.[0]?.split("\n").map((line, idx) => (
                            <Box key={item.id! + idx} sx={{ wordWrap: "break-word", overflowWrap: "anywhere" }}>
                                {mapLinks([line])}
                            </Box>
                        ))}
                    </Box>
                </FormControl>
            );

        case FormItemType.Date:
            return (
                <FormControl disabled={disabled || item.readonly} component="fieldset" fullWidth>
                    <FormItemHeader title={item.title} required={item.required} id={item.id} disabled={disabled} />
                    <DatePicker
                        value={item.value}
                        onChange={(v) => handleChange(v)}
                        disabled={item.readonly}
                        slotProps={{ textField: { size: "small", fullWidth: true } }}
                    />
                </FormControl>
            );

        case FormItemType.Time:
            return (
                <FormControl disabled={disabled || item.readonly} component="fieldset" fullWidth>
                    <FormItemHeader title={item.title} required={item.required} id={item.id} disabled={disabled} />
                    <TimePicker
                        value={item.value}
                        onChange={(v) => handleChange(v)}
                        disabled={item.readonly}
                        slotProps={{ textField: { size: "small", fullWidth: true } }}
                    />
                </FormControl>
            );

        case FormItemType.DateTime:
            return (
                <FormControl disabled={disabled || item.readonly} component="fieldset" fullWidth>
                    <FormItemHeader title={item.title} required={item.required} id={item.id} disabled={disabled} />
                    <DateTimePicker
                        value={item.value}
                        onChange={(v) => handleChange(v)}
                        disabled={item.readonly}
                        slotProps={{ textField: { size: "small", fullWidth: true } }}
                    />
                </FormControl>
            );

        case FormItemType.File:
            return (
                <FormControl fullWidth>
                    <FormItemHeader title={item.title} required={item.required} id={item.id} disabled={disabled} />
                    {Number.isInteger(fileIndexToDelete) ? (
                        <Confirmation
                            title={t("deleteFile", {
                                fileName: (item.value as FormsFile[])[fileIndexToDelete as number].name,
                            })}
                            confirmBtnText={t("delete")}
                            textAlign="center"
                            onCancel={() => setFileIndexToDelete(null)}
                            component="form"
                            onSubmit={deleteFile}
                            headerShadow={false}
                        />
                    ) : (
                        <>
                            {item.value && !!item.value.length ? (
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
                                            readonly={item.readonly}
                                            activeImage={activeImage}
                                            isModalOpen={modalOpen}
                                            removeFile={() => handleRemoveFile(index)}
                                            openImageModal={openImageModal}
                                        />
                                    )}
                                </StyledFixedSizeList>
                            ) : (
                                <Typography variant="body2" my={1}>
                                    {t("noFilesUploaded")}
                                </Typography>
                            )}
                            <AddFilesButton
                                accept={item.accept}
                                multiple={item.multiple}
                                onChange={(e) => handleFileUpload(e, item.id!)}
                                uploading={uploading}
                                disabled={disabled || item.readonly}
                            />
                        </>
                    )}
                    <ImgModal src={activeImage ?? ""} open={modalOpen} onClose={() => toggleModal()} anonymous />
                    <FormItemMessage open={infoMessage.length > 0} message={infoMessage} onClose={closeSnackbar} />
                </FormControl>
            );

        default:
            return null;
    }
}
