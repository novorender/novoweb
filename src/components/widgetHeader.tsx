import { MouseEvent, ReactNode, useState } from "react";
import { Box, IconButton, MenuProps, Typography, useTheme } from "@mui/material";
import { Close, MoreVert } from "@mui/icons-material";

import { Widget } from "config/features";
import { Divider } from "components";
import { useAppDispatch } from "app/store";
import { explorerActions } from "slices/explorerSlice";

export function WidgetHeader({
    widget: { name, Icon, key },
    children,
    WidgetMenu,
    disableShadow,
}: {
    widget: Widget;
    WidgetMenu?: (props: MenuProps) => JSX.Element;
    children?: ReactNode;
    disableShadow?: boolean;
}) {
    const theme = useTheme();
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

    return (
        <Box boxShadow={!disableShadow ? theme.customShadows.widgetHeader : undefined}>
            <Box p={1} display="flex">
                <Box display="flex" alignItems="center">
                    {WidgetMenu ? (
                        <IconButton onClick={openMenu}>
                            <MoreVert />
                            <WidgetMenu
                                onClick={(e) => e.stopPropagation()}
                                anchorEl={menuAnchor}
                                open={Boolean(menuAnchor)}
                                onClose={closeMenu}
                            />
                        </IconButton>
                    ) : null}
                    <Icon style={{ marginRight: theme.spacing(1) }} />
                    <Typography variant="h6" component="h2">
                        {name}
                    </Typography>
                </Box>
                <Box ml="auto">
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
