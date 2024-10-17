import { ChevronRight, SpaceDashboard } from "@mui/icons-material";
import { Box, Divider, IconButton, Tooltip, useTheme } from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "app/redux-store-interactions";
import { HudPanel } from "components/hudPanel";
import { CameraSpeed } from "features/cameraSpeed";
import { ClearSelection } from "features/clearSelection";
import { ClearView } from "features/clearView";
import { FlyToSelected } from "features/flyToSelected";
import { HideSelected } from "features/hideSelected";
import { Home } from "features/home";
import { OrthoShortcut } from "features/orthoShortcut";
import { ShareLink } from "features/shareLink";
import { StepBack } from "features/stepBack";
import { StepForwards } from "features/stepForwards";
import { ViewOnlySelected } from "features/viewOnlySelected";
import { useToggle } from "hooks/useToggle";
import { selectWidgetGroupPanelState } from "slices/explorer";

export function PrimaryMenuNew() {
    const theme = useTheme();
    const { t } = useTranslation();
    const [open, toggle] = useToggle(true);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const widgetGroupPanelState = useAppSelector(selectWidgetGroupPanelState);
    const collapsedWidth = 56;
    const expandedWidthRef = useRef<number>();
    const [width, setWidth] = useState<number | undefined>();

    const handleToggle = () => {
        setWidth(open ? collapsedWidth : expandedWidthRef.current);

        toggle();
    };

    useEffect(() => {
        if (open && panelRef.current && !expandedWidthRef.current) {
            expandedWidthRef.current = panelRef.current.querySelector("div")!.clientWidth;
            setWidth(expandedWidthRef.current);
        }
    }, [open]);

    const widgetGroupPanelWidth =
        widgetGroupPanelState.expanded && widgetGroupPanelState.open
            ? theme.customSpacing.widgetGroupPanelExpandedWidth
            : widgetGroupPanelState.open
              ? 12
              : 0;

    return (
        <Box
            sx={{
                zIndex: 1050,
                position: "absolute",
                pointerEvents: "none",
                display: "grid",
                placeItems: "end center",
                bottom: 0,
                left: `min(50%, 100% - ${theme.spacing(widgetGroupPanelWidth)} - ${
                    open ? (expandedWidthRef.current ?? 0) / 2 : collapsedWidth / 2
                }px)`,
                translate: "-50% 0",
                transition: "left 0.2s",
            }}
            ref={panelRef}
        >
            <HudPanel
                sx={{
                    display: "flex",
                    width: open ? width : collapsedWidth,
                    overflow: "hidden",
                    transition: "all 0.2s",
                    pointerEvents: "auto",
                }}
            >
                <Tooltip title={open ? t("collapse") : t("expand")} placement="top">
                    <Box>
                        <IconButton onClick={handleToggle}>{open ? <ChevronRight /> : <SpaceDashboard />}</IconButton>
                    </Box>
                </Tooltip>
                <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 1 }} />
                <Home newDesign />
                <CameraSpeed newDesign />
                <StepBack newDesign />
                <StepForwards newDesign />
                <FlyToSelected newDesign />
                <OrthoShortcut newDesign />
                <ShareLink variant="primaryMenu" explorerStateOverwrite={{ forms: undefined }} />
                <Divider orientation="vertical" variant="middle" flexItem sx={{ mx: 1 }} />
                <ViewOnlySelected newDesign />
                <HideSelected newDesign />
                <ClearSelection newDesign />
                <ClearView newDesign />
            </HudPanel>
        </Box>
    );
}
