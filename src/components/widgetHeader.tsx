import { Close, CropSquare, Minimize, MoreVert } from "@mui/icons-material";
import { Box, IconButton, MenuProps, SvgIcon, Typography, useMediaQuery, useTheme } from "@mui/material";
import { MouseEvent, ReactNode, useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app";
import { Divider } from "components";
import { Widget } from "config/features";
import { explorerActions, selectMaximized, selectMinimized } from "slices/explorer";

export function WidgetHeader({
    widget: { name, Icon, key },
    children,
    disableShadow,
    WidgetMenu,
}: {
    widget: Widget;
    children?: ReactNode;
    disableShadow?: boolean;
    WidgetMenu?: (props: MenuProps) => JSX.Element | null;
}) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
    const maximized = useAppSelector(selectMaximized).includes(key);
    const minimized = useAppSelector(selectMinimized) === key;
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

    const toggleMaximize = () => {
        dispatch(explorerActions.toggleMaximized(key));
    };

    const toggleMinimize = () => {
        dispatch(explorerActions.setMinimized(minimized ? undefined : key));
    };

    useEffect(() => {
        if (!isSmall) {
            dispatch(explorerActions.setMinimized(undefined));
        }
    }, [isSmall, dispatch]);

    return (
        <Box boxShadow={!disableShadow ? theme.customShadows.widgetHeader : undefined}>
            <Box p={1} display="flex">
                <Box display="flex" alignItems="center">
                    {WidgetMenu && WidgetMenu({ open: false }) ? (
                        <>
                            <IconButton edge="start" size="small" onClick={openMenu} sx={{ mr: 1 }}>
                                <MoreVert fontSize="small" />
                            </IconButton>
                            <WidgetMenu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu} />
                        </>
                    ) : null}
                    <SvgIcon
                        sx={{
                            mr: 1,
                        }}
                    >
                        <Icon />
                    </SvgIcon>
                    <Typography variant="h6" component="h2">
                        {name}
                    </Typography>
                </Box>
                <Box ml="auto">
                    {isSmall ? (
                        <IconButton sx={{ mr: 1 }} data-test="minimize-widget" size="small" onClick={toggleMinimize}>
                            <Minimize color={minimized ? "primary" : undefined} />
                        </IconButton>
                    ) : null}
                    {toggleMaximize ? (
                        <IconButton sx={{ mr: 1 }} data-test="minimize-widget" size="small" onClick={toggleMaximize}>
                            {<CropSquare color={maximized ? "primary" : undefined} />}
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
