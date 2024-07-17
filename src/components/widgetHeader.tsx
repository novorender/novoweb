import { ChevronLeft, Close, CropSquare, Height, Minimize, MoreVert, Star, StarOutline } from "@mui/icons-material";
import { Box, IconButton, MenuProps, SvgIcon, Typography, useMediaQuery, useTheme } from "@mui/material";
import { MouseEvent, ReactNode, useEffect, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Widget, WidgetKey } from "config/features";
import {
    explorerActions,
    selectFavoriteWidgets,
    selectGridSize,
    selectMaximized,
    selectMinimized,
    selectNewDesign,
    selectPositionedWidgets,
} from "slices/explorer";

import { Divider } from "./divider";

export function WidgetHeader(props: {
    widget: Widget;
    children?: ReactNode;
    disableShadow?: boolean;
    WidgetMenu?: (props: MenuProps) => JSX.Element | null;
    menuOpen: boolean;
    toggleMenu: () => void;
}) {
    const newDesign = useAppSelector(selectNewDesign);

    if (newDesign) {
        return <WidgetHeaderNew {...props} />;
    } else {
        return <WidgetHeaderOld {...props} />;
    }
}

function WidgetHeaderNew({
    widget: { name, Icon, key },
    children,
    disableShadow,
    WidgetMenu,
    menuOpen,
    toggleMenu,
}: {
    widget: Widget;
    children?: ReactNode;
    disableShadow?: boolean;
    WidgetMenu?: (props: MenuProps) => JSX.Element | null;
    menuOpen: boolean;
    toggleMenu: () => void;
}) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
    const minimized = useAppSelector(selectMinimized) === key;
    const isFavorite = useAppSelector((state) => selectFavoriteWidgets(state).includes(key));
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

    const toggleFavorite = () => {
        if (isFavorite) {
            dispatch(explorerActions.removeFavoriteWidget(key));
        } else {
            dispatch(explorerActions.addFavoriteWidget(key));
        }
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
                    {!menuOpen && (
                        <IconButton edge="start" size="small" onClick={toggleMenu} sx={{ mr: 1 }}>
                            <ChevronLeft fontSize="small" />
                        </IconButton>
                    )}
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
                    {!menuOpen && (
                        <IconButton
                            edge="start"
                            size="small"
                            onClick={toggleFavorite}
                            sx={{ ml: 1 }}
                            color={isFavorite ? "primary" : "default"}
                        >
                            {isFavorite ? <Star /> : <StarOutline />}
                        </IconButton>
                    )}
                </Box>
                <Box ml="auto">
                    {!menuOpen && <ExpansionButtons widgetKey={key} />}
                    {isSmall ? (
                        <IconButton sx={{ mr: 1 }} data-test="minimize-widget" size="small" onClick={toggleMinimize}>
                            <Minimize color={minimized ? "primary" : undefined} />
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

function ExpansionButtons({ widgetKey }: { widgetKey: WidgetKey }) {
    const positionedWidgets = useAppSelector(selectPositionedWidgets);
    const gridSize = useAppSelector(selectGridSize);
    const dispatch = useAppDispatch();
    const positionedWidget = positionedWidgets.find((w) => w.key === widgetKey);

    if (!positionedWidget) {
        return null;
    }

    const horizontalEnabled = gridSize.width > 1;
    const verticalEnabled = gridSize.height > 1;

    const widthExpanded = positionedWidget.width > 1;
    const heightExpanded = positionedWidget.height > 1;

    const toggleWidthExpanded = () => {
        dispatch(explorerActions.toggleMaximizedHorizontal(widgetKey));
    };

    const toggleHeightExpanded = () => {
        dispatch(explorerActions.toggleMaximized(widgetKey));
    };

    return (
        <>
            {horizontalEnabled && (
                <IconButton
                    onClick={toggleWidthExpanded}
                    color={widthExpanded ? "primary" : "default"}
                    sx={{ rotate: "90deg" }}
                >
                    <Height />
                </IconButton>
            )}
            {verticalEnabled && (
                <IconButton onClick={toggleHeightExpanded} color={heightExpanded ? "primary" : "default"}>
                    <Height />
                </IconButton>
            )}
        </>
    );
}

function WidgetHeaderOld({
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
