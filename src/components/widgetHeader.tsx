import { MouseEvent, ReactNode, useEffect, useState } from "react";
import { Box, IconButton, MenuProps, Typography, useMediaQuery, useTheme } from "@mui/material";
import { Close, CropSquare, Minimize, MoreVert } from "@mui/icons-material";

import { Widget } from "config/features";
import { Divider } from "components";
import { useAppDispatch } from "app/store";
import { explorerActions } from "slices/explorerSlice";

export function WidgetHeader({
    widget: { name, Icon, key },
    children,
    disableShadow,
    minimized,
    toggleMinimize,
    WidgetMenu,
}: {
    widget: Widget;
    children?: ReactNode;
    disableShadow?: boolean;
    minimized?: boolean;
    toggleMinimize?: () => void;
    WidgetMenu?: (props: MenuProps) => JSX.Element;
}) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
    const dispatch = useAppDispatch();

    const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);

    const handleClose = () => {
        dispatch(explorerActions.removeWidgetSlot(key));
    };

    const openMenu = (e: MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        setMenuAnchor(e.currentTarget);
    };

    const closeMenu = () => {
        setMenuAnchor(null);
    };

    useEffect(() => {
        if (!isSmall && minimized && toggleMinimize) {
            toggleMinimize();
        }
    }, [isSmall, minimized, toggleMinimize]);

    return (
        <Box boxShadow={!disableShadow ? theme.customShadows.widgetHeader : undefined}>
            <Box p={1} display="flex">
                <Box display="flex" alignItems="center">
                    {WidgetMenu ? (
                        <>
                            <IconButton size="small" onClick={openMenu}>
                                <MoreVert fontSize="small" />
                            </IconButton>
                            <WidgetMenu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu} />
                        </>
                    ) : null}
                    <Icon style={{ marginRight: theme.spacing(1) }} />
                    <Typography variant="h6" component="h2">
                        {name}
                    </Typography>
                </Box>
                <Box ml="auto">
                    {toggleMinimize && isSmall ? (
                        <IconButton sx={{ mr: 1 }} data-test="minimize-widget" size="small" onClick={toggleMinimize}>
                            {minimized ? <CropSquare /> : <Minimize />}
                        </IconButton>
                    ) : null}
                    <IconButton data-test="close-widget" size="small" onClick={handleClose}>
                        <Close />
                    </IconButton>
                </Box>
            </Box>
            {children ? (
                <Box px={1}>
                    <Divider />
                    {children}
                </Box>
            ) : null}
        </Box>
    );
}
