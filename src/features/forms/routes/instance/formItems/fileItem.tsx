import {
    AttachFileOutlined,
    Delete,
    Download,
    FilePresentOutlined,
    MoreVert,
    PictureAsPdfOutlined,
} from "@mui/icons-material";
import {
    Box,
    css,
    IconButton,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    styled,
    useTheme,
} from "@mui/material";
import { t } from "i18next";
import { CSSProperties, type MouseEvent, useState } from "react";

import { Tooltip } from "components";
import { type FormsFile } from "features/forms/types";

export interface FileItemProps {
    style: CSSProperties;
    file: FormsFile;
    readonly: boolean;
    activeImage: string;
    isModalOpen: boolean;
    removeFile: () => void;
    openImageModal: (url?: string) => void;
}

const Img = styled("img")(
    () => css`
        height: 100%;
        width: 100%;
        object-fit: cover;
        display: block;
    `,
);

export default function FileItem({
    style,
    file,
    readonly,
    activeImage,
    isModalOpen,
    removeFile,
    openImageModal,
}: FileItemProps) {
    const theme = useTheme();

    const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

    const stopPropagation = (evt: MouseEvent | FocusEvent) => {
        evt.stopPropagation();
    };

    const openMenu = (evt: MouseEvent<HTMLButtonElement>) => {
        stopPropagation(evt);
        setMenuAnchor(evt.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    const isImage = /^image\//.test(file.type);
    const isPdf = /^application\/pdf$/.test(file.type);
    const icon = isImage ? (
        file.url ? (
            <Img src={file.url} alt={file.name} crossOrigin="anonymous" />
        ) : (
            <AttachFileOutlined sx={{ width: 50, height: 50 }} />
        )
    ) : isPdf ? (
        <PictureAsPdfOutlined sx={{ width: 50, height: 50 }} />
    ) : (
        <FilePresentOutlined sx={{ width: 50, height: 50 }} />
    );

    const handleFileClick = () => {
        if (!file.url) {
            return;
        } else if (isImage) {
            openImageModal(file.url);
        } else if (isPdf) {
            window.open(file.url, "_blank");
        } else {
            downloadFile(file);
        }
    };

    return (
        <ListItemButton
            style={style}
            onClick={handleFileClick}
            sx={{
                padding: `${theme.spacing(0.5)} ${theme.spacing(1)}`,
                background: isModalOpen && file.url === activeImage ? theme.palette.grey[300] : "",
            }}
        >
            <Box width={1} maxHeight={70} height={70} display="flex" alignItems="flex-start" overflow="hidden">
                <ListItemIcon>
                    <Box
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        sx={{
                            position: "relative",
                            "&::before": {
                                position: "absolute",
                                top: 0,
                                left: 0,
                                borderRadius: "2px",
                                px: 1,
                                py: 0.5,
                                color: "common.white",
                                fontSize: "10px",
                                fontWeight: 600,
                                content: `"${formatFileSize(file.size)}"`,
                                backgroundColor: "secondary.main",
                            },
                        }}
                        bgcolor={theme.palette.grey[200]}
                        height={70}
                        width={100}
                        flexShrink={0}
                        flexGrow={0}
                    >
                        {icon}
                    </Box>
                </ListItemIcon>
                <ListItemText
                    sx={{ ml: 1 }}
                    primary={
                        <Tooltip disableInteractive title={file.name}>
                            <span>{file.name}</span>
                        </Tooltip>
                    }
                    primaryTypographyProps={{
                        noWrap: true,
                        variant: "body1",
                        color: isPdf ? "primary" : "default",
                        sx: { fontWeight: 600, mb: 1, textDecoration: isPdf ? "underline" : "none" },
                    }}
                    secondary={
                        <Tooltip disableInteractive title={formatLastModified(file.lastModified)}>
                            <span>{formatLastModified(file.lastModified)}</span>
                        </Tooltip>
                    }
                    secondaryTypographyProps={{ noWrap: true }}
                />
            </Box>
            <IconButton
                color={menuAnchor ? "primary" : "default"}
                size="small"
                aria-haspopup="true"
                sx={{ p: 0, height: 70 }}
                disableRipple
                onClick={openMenu}
            >
                <MoreVert />
            </IconButton>
            <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClick={stopPropagation} onClose={closeMenu}>
                <MenuItem
                    onClick={() => {
                        downloadFile(file);
                        closeMenu();
                    }}
                >
                    <Download fontSize="small" />
                    <ListItemText primary={t("download")} />
                </MenuItem>
                {!readonly && (
                    <MenuItem onClick={removeFile}>
                        <Delete fontSize="small" />
                        <ListItemText primary={t("remove")} />
                    </MenuItem>
                )}
            </Menu>
        </ListItemButton>
    );
}

function formatFileSize(bytes: number): string {
    const units = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
    if (bytes === 0) {
        return "0 Bytes";
    }
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const size = bytes / Math.pow(1024, i);
    return `${size.toFixed(2)} ${units[i]}`;
}

function formatLastModified(timestamp: number): string {
    const date = new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
    };
    return date.toLocaleString(window.navigator.language, options);
}

async function downloadFile(file: FormsFile) {
    if (file.url) {
        try {
            const resp = await fetch(file.url);

            if (!resp.ok) {
                throw new Error(`Failed to download ${file.name}`);
            }

            const blob = await resp.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = file.name;

            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);

            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
        }
    } else {
        console.error("File URL is not defined.");
    }
}
