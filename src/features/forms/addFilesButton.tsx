import { PhotoCamera } from "@mui/icons-material";
import { Box, Button, ButtonGroup, CircularProgress } from "@mui/material";
import { t } from "i18next";
import { type ChangeEventHandler, type DragEventHandler, type MouseEventHandler, useRef } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { selectIsMobile } from "features/render";

interface AddFilesButtonProps {
    accept: string;
    multiple: boolean;
    uploading: boolean;
    disabled?: boolean;
    onChange: ChangeEventHandler<HTMLInputElement>;
}

export default function AddFilesButton({
    accept,
    multiple,
    onChange,
    uploading,
    disabled = false,
}: AddFilesButtonProps) {
    const isMobile = useAppSelector(selectIsMobile);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const stopPropagation: DragEventHandler = (e) => {
        e.preventDefault();
    };

    const handleAddFilesClick: MouseEventHandler = () => {
        fileInputRef.current?.removeAttribute("capture");
        fileInputRef.current?.click();
    };

    const handleCapturePhotoClick: MouseEventHandler = () => {
        fileInputRef.current?.setAttribute("capture", "environment");
        fileInputRef.current?.click();
    };

    const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        e.preventDefault();
        onChange(e);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <Box display="flex" onDragOver={stopPropagation} onDrop={stopPropagation}>
            <input type="file" ref={fileInputRef} onChange={handleChange} accept={accept} multiple={multiple} hidden />
            <ButtonGroup variant="contained">
                <Button onClick={handleAddFilesClick} disabled={disabled || uploading}>
                    {uploading ? <CircularProgress size={24} /> : t("addFile", { count: multiple ? 2 : 1 })}
                </Button>
                {isMobile && accept.includes("image") && (
                    <Button
                        onClick={handleCapturePhotoClick}
                        disabled={disabled || uploading}
                        startIcon={<PhotoCamera />}
                    >
                        {t("capturePhoto")}
                    </Button>
                )}
            </ButtonGroup>
        </Box>
    );
}
