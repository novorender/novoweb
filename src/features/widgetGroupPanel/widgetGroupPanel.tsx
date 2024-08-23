import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import {
    Box,
    css,
    Divider,
    FabProps,
    IconButton,
    SpeedDial,
    speedDialClasses,
    SpeedDialProps,
    Stack,
    styled,
    Tooltip,
    useTheme,
} from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { HudPanel } from "components/hudPanel";
import { FeatureGroupKey, featureGroups } from "config/features";
import { groupSorting } from "features/groupedWidgetList/sorting";
import NovorenderIcon from "media/icons/novorender-small.svg?react";
import {
    explorerActions,
    selectCanAddWidget,
    selectIsOnline,
    selectWidgetGroupPanelState,
    selectWidgetLayout,
    selectWidgetSlot,
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

    return (
        <Box
            sx={{
                zIndex: 1050,
                pointerEvents: "none",
                position: "absolute",
                right: 0,
                bottom: 0,
                height: open ? `calc(100% - ${theme.spacing(layout.padWidgetsTop ? 9 : 0)})` : undefined,
            }}
        >
            {open && (
                <HudPanel
                    sx={{
                        display: "flex",
                        flexDirection: "column",
                        transition: "all 0.2s",
                        pointerEvents: "auto",
                        height: `calc(100% - ${theme.spacing(8)})`,
                        mb: 8,
                        borderBottomLeftRadius: 0,
                        borderBottomRightRadius: 0,
                    }}
                >
                    <Stack
                        sx={{
                            gap: 1,
                            overflow: "hidden",
                            width: expanded
                                ? theme.spacing(theme.customSpacing.widgetGroupPanelExpandedWidth - 4)
                                : theme.spacing(8),
                            transition: "width 0.2s",
                        }}
                    >
                        <Box display="flex" justifyContent="center">
                            <IconButton
                                onClick={() =>
                                    dispatch(
                                        explorerActions.setWidgetGroupPanelState({ ...state, expanded: !expanded })
                                    )
                                }
                            >
                                {expanded ? <ChevronRight /> : <ChevronLeft />}
                            </IconButton>
                        </Box>
                        <Divider sx={{ mt: -0.5 }} />
                        {sortedFeatureGroups.map((g) => (
                            <Section key={g.key} groupKey={g.key} />
                        ))}
                    </Stack>
                    <BottomPanel />
                </HudPanel>
            )}
            <Box position="relative">
                <LogoBtn
                    open={open}
                    onClick={() => dispatch(explorerActions.setWidgetGroupPanelState({ ...state, open: !open }))}
                />
            </Box>
        </Box>
    );
}

function BottomPanel() {
    // complicated margins/width/heights and wrappers around the panel and svg are all for good shadows
    return (
        <Box sx={{ position: "absolute", display: "flex", height: "64px", bottom: 0, left: 0, width: "100%" }}>
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

function Section({ groupKey }: { groupKey: FeatureGroupKey }) {
    const widgetSlot = useAppSelector(selectWidgetSlot);
    const canAddWidget = useAppSelector(selectCanAddWidget);
    const dispatch = useAppDispatch();
    const { name, Icon } = featureGroups[groupKey];

    const handleClick = () => {
        if (widgetSlot.open || canAddWidget) {
            dispatch(explorerActions.setWidgetSlot({ open: true, group: groupKey }));
        }
    };

    return (
        <Tooltip title={name} placement="left">
            <SectionBox onClick={handleClick}>
                <IconButton size="large">
                    <Icon />
                </IconButton>
                {name}
            </SectionBox>
        </Tooltip>
    );
}

const SectionBox = styled(Box)(
    ({ theme }) => css`
        display: flex;
        align-items: center;
        padding-right: ${theme.spacing(2)};
        padding-left: ${theme.spacing(1)};
        gap: ${theme.spacing(2)};
        font-weight: 600;
        cursor: pointer;
    `
);

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
