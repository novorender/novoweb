import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import {
    Box,
    BoxProps,
    ClickAwayListener,
    css,
    Divider,
    FabProps,
    IconButton,
    ListItemIcon,
    ListItemText,
    MenuItem,
    Popper,
    SpeedDial,
    speedDialClasses,
    SpeedDialProps,
    Stack,
    styled,
    Tooltip,
    Typography,
    useTheme,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { HudPanel } from "components/hudPanel";
import IconButtonExt from "components/iconButtonExt";
import { FeatureGroupKey, featureGroups, featuresConfig, FeatureType, Widget, WidgetKey } from "config/features";
import { groupSorting } from "features/groupedWidgetList/sorting";
import { ShareLink } from "features/shareLink";
import { sorting } from "features/widgetList/sorting";
import { useOpenWidget } from "hooks/useOpenWidget";
import NovorenderIcon from "media/icons/novorender-small.svg?react";
import {
    explorerActions,
    selectEnabledWidgets,
    selectIsOnline,
    selectLockedWidgets,
    selectWidgetGroupPanelState,
    selectWidgetLayout,
    selectWidgets,
} from "slices/explorer";

const sortedFeatureGroups = Object.values(featureGroups).sort((a, b) => {
    const idxA = groupSorting.indexOf(a.key);
    const idxB = groupSorting.indexOf(b.key);

    return (idxA === -1 ? groupSorting.length : idxA) - (idxB === -1 ? groupSorting.length : idxB);
});

export function WidgetGroupPanel() {
    const theme = useTheme();
    const state = useAppSelector(selectWidgetGroupPanelState);
    const layout = useAppSelector(selectWidgetLayout);
    const { open, expanded } = state;
    const dispatch = useAppDispatch();
    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const [activeGroup, setActiveSection] = useState<FeatureGroupKey | null>(null);
    const enabledWidgets = useAppSelector(selectEnabledWidgets);
    const lockedWidgets = useAppSelector(selectLockedWidgets);
    const openWidget = useOpenWidget();

    const closePopper = () => {
        setAnchorEl(null);
        setActiveSection(null);
    };

    const handleSectionClick = (e: React.MouseEvent<HTMLElement>, groupKey: FeatureGroupKey) => {
        if (groupKey !== activeGroup) {
            setActiveSection(groupKey);
            // Use parent element as anchor, because if we expand the panel -
            // anchor changes and tooltip flies away
            setAnchorEl(e.currentTarget.closest("[data-section-box]") as HTMLElement);
        } else {
            closePopper();
        }
    };

    const handleWidgetClick = (widgetKey: WidgetKey) => {
        closePopper();
        if (widgetKey !== featuresConfig.shareLink.key) {
            openWidget(widgetKey);
        }
    };

    const nonEmptyGroups = useMemo(() => {
        return sortedFeatureGroups
            .map((group) => {
                const widgets = enabledWidgets.filter(
                    (widget) =>
                        (widget.type === FeatureType.Widget || widget.type === FeatureType.AdminWidget) &&
                        "groups" in widget &&
                        widget.groups.includes(group.key as never),
                );

                const sortAndFilterWidgets = (widgets: Widget[]) =>
                    widgets
                        .filter((widget) => !lockedWidgets.includes(widget.key))
                        .sort((a, b) => {
                            const idxA = sorting.indexOf(a.key);
                            const idxB = sorting.indexOf(b.key);

                            return (idxA === -1 ? sorting.length : idxA) - (idxB === -1 ? sorting.length : idxB);
                        });

                return { group, widgets: sortAndFilterWidgets(widgets) };
            })
            .filter((e) => e.widgets.length > 0);
    }, [enabledWidgets, lockedWidgets]);

    return (
        <ClickAwayListener onClickAway={closePopper}>
            <Box
                sx={{
                    zIndex: 1060,
                    pointerEvents: "none",
                    position: "absolute",
                    right: 0,
                    bottom: 0,
                    height: open ? (layout.padWidgetsTop ? `calc(100% - ${theme.spacing(9)})` : "100%") : undefined,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {open && (
                    <>
                        <HudPanel
                            sx={{
                                display: "flex",
                                flexDirection: "column",
                                transition: "all 0.2s",
                                pointerEvents: "auto",
                                flex: "auto",
                                borderBottomLeftRadius: 0,
                                borderBottomRightRadius: 0,
                                position: "relative",
                                overflow: "auto",
                            }}
                        >
                            <Stack
                                sx={{
                                    gap: 1,
                                    overflowX: "hidden",
                                    width: expanded
                                        ? theme.spacing(theme.customSpacing.widgetGroupPanelExpandedWidth - 4)
                                        : theme.spacing(8),
                                    transition: "width 0.2s",
                                    position: "relative",
                                    flex: "auto",
                                }}
                            >
                                <Box display="flex" justifyContent="center">
                                    <IconButton
                                        onClick={() =>
                                            dispatch(
                                                explorerActions.setWidgetGroupPanelState({
                                                    ...state,
                                                    expanded: !expanded,
                                                }),
                                            )
                                        }
                                    >
                                        {expanded ? <ChevronRight /> : <ChevronLeft />}
                                    </IconButton>
                                </Box>
                                <Divider sx={{ mt: -0.5 }} />
                                {nonEmptyGroups.map(({ group }) => (
                                    <Section
                                        key={group.key}
                                        groupKey={group.key}
                                        onClick={handleSectionClick}
                                        active={group.key === activeGroup}
                                        sidebarOpen={expanded}
                                    />
                                ))}
                            </Stack>
                        </HudPanel>
                        <BottomPanel />

                        <Popper
                            open={anchorEl !== null}
                            anchorEl={anchorEl}
                            placement="left"
                            disablePortal
                            sx={{ zIndex: 1060, pointerEvents: "auto" }}
                            modifiers={[
                                // to avoid jumping when collapsing/expanding sidebar while the popper is open
                                {
                                    name: "computeStyles",
                                    options: {
                                        adaptive: false,
                                    },
                                },
                            ]}
                        >
                            <HudPanel sx={{ mr: 2 }}>
                                <SectionWidgets
                                    onSelect={handleWidgetClick}
                                    widgets={nonEmptyGroups.find((g) => g.group.key === activeGroup)?.widgets ?? []}
                                />
                            </HudPanel>
                        </Popper>
                    </>
                )}
                <Box position="relative">
                    <LogoBtn
                        open={open}
                        onClick={() => {
                            closePopper();
                            dispatch(explorerActions.setWidgetGroupPanelState({ ...state, open: !open }));
                        }}
                    />
                </Box>
            </Box>
        </ClickAwayListener>
    );
}

function BottomPanel() {
    // complicated margins/width/heights and wrappers around the panel and svg are all for good shadows
    return (
        <Box sx={{ flex: "0 0 64px", display: "flex", zIndex: 1050, pointerEvents: "auto" }}>
            <Box sx={{ flex: "auto", overflow: "hidden", ml: "-10px", mb: "-10px" }}>
                <HudPanel
                    sx={{
                        height: "calc(100% - 10px)",
                        borderTopLeftRadius: 0,
                        borderTopRightRadius: 0,
                        borderBottomRightRadius: 0,
                        ml: "10px",
                        mb: "10px",
                        filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.2)) drop-shadow(0px 4px 5px rgba(0,0,0,0.14)) drop-shadow(0px 1px 10px rgba(0,0,0,0.12))",
                    }}
                    elevation={0}
                ></HudPanel>
            </Box>
            <Box sx={{ overflow: "hidden", width: "74px", mr: "-10px", mb: "-10px" }}>
                <svg
                    width="64"
                    height="64"
                    viewBox="0 0 64 64"
                    fill="white"
                    style={{
                        filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.2)) drop-shadow(0px 4px 5px rgba(0,0,0,0.14)) drop-shadow(0px 1px 10px rgba(0,0,0,0.12))",
                    }}
                >
                    <path d="m 0 0 v 64 a 16 16 0 0 0 16 -16 a 36 36 0 0 1 32 -32 A 16 16 0 0 0 64 0 z" />
                </svg>
            </Box>
        </Box>
    );
}

function Section({
    groupKey,
    onClick,
    active,
    sidebarOpen,
}: {
    groupKey: FeatureGroupKey;
    onClick: (e: React.MouseEvent<HTMLElement>, groupKey: FeatureGroupKey) => void;
    active: boolean;
    sidebarOpen: boolean;
}) {
    const { t } = useTranslation();
    const { nameKey, Icon } = featureGroups[groupKey];
    const name = t(nameKey);

    return (
        <Tooltip title={active ? "" : name} placement="left">
            <Box data-section-box>
                <SectionButton
                    onClick={(e) => onClick(e, groupKey)}
                    active={sidebarOpen && active}
                    component={sidebarOpen ? "button" : "div"}
                >
                    {sidebarOpen ? (
                        <Icon sx={{ ml: 1 }} />
                    ) : (
                        <IconButtonExt
                            size="large"
                            active={active}
                            sx={sidebarOpen && active ? { background: "transparent" } : {}}
                        >
                            <Icon />
                        </IconButtonExt>
                    )}
                    <Typography fontWeight={600}>{name}</Typography>
                </SectionButton>
            </Box>
        </Tooltip>
    );
}

const SectionButton = styled(Box, { shouldForwardProp: (prop) => prop !== "active" })<BoxProps & { active: boolean }>(
    ({ theme, active }) => css`
        width: 100%;
        display: flex;
        align-items: center;
        text-align: start;
        border: 0;
        padding-right: ${theme.spacing(2)};
        padding-left: ${theme.spacing(1)};
        gap: ${theme.spacing(2)};
        cursor: pointer;
        min-height: 48px;
        background: ${active ? theme.palette.primary.main : "transparent"};
        transition: background 0.2s;
        color: ${active ? theme.palette.primary.contrastText : theme.palette.action.active};
        border-radius: ${theme.shape.borderRadius}px;

        &:hover {
            background: ${active ? theme.palette.primary.dark : "transparent"};
        }
    `,
);

function SectionWidgets({ onSelect, widgets }: { onSelect: (widgetKey: WidgetKey) => void; widgets: Widget[] }) {
    const { t } = useTranslation();
    const activeWidgets = useAppSelector(selectWidgets);
    const isOnline = useAppSelector(selectIsOnline);

    return (
        <>
            {widgets.map((widget) => {
                const activeElsewhere = activeWidgets.includes(widget.key);
                const unavailable = !isOnline && "offline" in widget && !widget.offline;
                const { Icon } = widget;

                if (widget.key === featuresConfig.shareLink.key) {
                    return <ShareLink key={widget.key} asMenuItem onClick={() => onSelect(widget.key)} />;
                }

                return (
                    <MenuItem
                        key={widget.key}
                        disabled={activeElsewhere || unavailable}
                        onClick={() => onSelect(widget.key)}
                    >
                        <ListItemIcon>
                            <Icon />
                        </ListItemIcon>
                        <ListItemText>{t(widget.nameKey)}</ListItemText>
                    </MenuItem>
                );
            })}
        </>
    );
}

function LogoBtn({ open, onClick }: { open: boolean; onClick: () => void }) {
    const isOnline = useAppSelector(selectIsOnline);

    const handleToggle: SpeedDialProps["onOpen"] & SpeedDialProps["onClose"] = (_event, reason) => {
        if (!["toggle", "escapeKeyDown"].includes(reason)) {
            return;
        }

        onClick();
    };

    return (
        <Box position="relative">
            <SpeedDial
                ariaLabel="toggle widget group"
                open={open}
                onOpen={handleToggle}
                onClose={handleToggle}
                sx={{
                    position: "absolute",
                    bottom: -14,
                    right: -14,

                    [`.${speedDialClasses.actions}`]: {
                        padding: 0,
                    },
                }}
                FabProps={
                    {
                        color: isOnline ? "primary" : "secondary",
                        size: "large",
                    } as Partial<FabProps<"button">>
                }
                icon={<NovorenderIcon />}
            />
        </Box>
    );
}
