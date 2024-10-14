import { InfoOutlined } from "@mui/icons-material";
import { IconButton, IconButtonProps, Popover, PopoverProps } from "@mui/material";
import { ReactNode, useState } from "react";

export default function InfoPopup({
    children,
    buttonProps,
    popoverProps,
}: {
    children?: ReactNode;
    buttonProps?: Partial<IconButtonProps>;
    popoverProps?: Partial<PopoverProps>;
}) {
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);

    return (
        <>
            <IconButton {...buttonProps} aria-haspopup="true" onClick={(e) => setAnchorEl(e.currentTarget)}>
                <InfoOutlined />
            </IconButton>
            <Popover {...popoverProps} open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={() => setAnchorEl(null)}>
                {children}
            </Popover>
        </>
    );
}
