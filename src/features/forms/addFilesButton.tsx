import { Box, Button, CircularProgress } from "@mui/material";
import { t } from "i18next";
import { type ChangeEventHandler, type DragEventHandler, type MouseEventHandler, useRef } from "react";

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    const stopPropagation: DragEventHandler = (e) => {
        e.preventDefault();
    };

    const handleAddFilesClick: MouseEventHandler = () => fileInputRef.current?.click();

    const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
        onChange(e);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <Box display="flex" onDragOver={stopPropagation} onDrop={stopPropagation}>
            <input type="file" ref={fileInputRef} onChange={handleChange} accept={accept} multiple={multiple} hidden />
            <Button onClick={handleAddFilesClick} disabled={disabled || uploading} variant="contained">
                {uploading ? <CircularProgress size={24} /> : t("addFile", { count: multiple ? 2 : 1 })}
            </Button>
        </Box>
    );
}
