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
    const photoInputRef = useRef<HTMLInputElement>(null);

    const stopPropagation: DragEventHandler = (e) => {
        e.preventDefault();
    };

    const handleAddFilesClick: MouseEventHandler = () => {
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
            fileInputRef.current.click();
        }
    };

    const handleCapturePhotoClick: MouseEventHandler = () => {
        if (photoInputRef.current) {
            photoInputRef.current.value = "";
            photoInputRef.current.click();
        }
    };

    const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        e.preventDefault();
        onChange(e);
    };

    return (
        <Box display="flex" onDragOver={stopPropagation} onDrop={stopPropagation}>
            <input type="file" ref={fileInputRef} onChange={handleChange} accept={accept} multiple={multiple} hidden />
            {isMobile && accept.includes("image") && (
                <input
                    type="file"
                    capture="environment"
                    ref={photoInputRef}
                    onChange={handleChange}
                    accept={accept}
                    multiple={multiple}
                    hidden
                />
            )}
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
                        {uploading ? <CircularProgress size={24} /> : t("capturePhoto")}
                    </Button>
                )}
            </ButtonGroup>
        </Box>
    );
}
