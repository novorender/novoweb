import { useEffect } from "react";
import {
    useTheme,
    useMediaQuery,
    FabProps,
    SpeedDial,
    SpeedDialIcon,
    CloseReason,
    OpenReason,
    Box,
} from "@mui/material";

import { MultipleSelection } from "features/multipleSelection";
import { ClearSelection } from "features/clearSelection";
import { ViewOnlySelected } from "features/viewOnlySelected";
import { SelectionColor } from "features/selectionColor";
import { HideSelected } from "features/hideSelected";
import { ToggleSubtrees } from "features/toggleSubtrees";
import { useAppSelector } from "app/store";
import { useToggle } from "hooks/useToggle";
import { selectMainObject } from "features/render/renderSlice";

import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

export function SelectionModifierMenu() {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
    const [interacted, toggleInteracted] = useToggle(isSmall);
    const mainObject = useAppSelector(selectMainObject);
    const [open, toggle] = useToggle();

    useEffect(() => {
        if (!interacted && mainObject !== undefined && !open) {
            toggle();
        }
    }, [mainObject, open, toggle, interacted]);

    const handleToggle = (reason: OpenReason | CloseReason) => {
        if (!["toggle", "escapeKeyDown"].includes(reason)) {
            return;
        }

        if (!interacted) {
            toggleInteracted();
        }

        toggle();
    };

    return (
        <Box sx={{ gridColumn: "1 / 2", gridRow: "2 / 2" }} display="flex" alignItems={"flex-end"}>
            <SpeedDial
                data-test="selection-modifier-menu"
                open={open}
                onOpen={(_event, reason) => handleToggle(reason)}
                onClose={(_event, reason) => handleToggle(reason)}
                ariaLabel="selection modifiers"
                FabProps={
                    {
                        color: "secondary",
                        size: isSmall ? "small" : "large",
                        "data-test": "selection-modifier-menu-fab",
                    } as Partial<FabProps<"button", { "data-test": string }>>
                }
                icon={<SpeedDialIcon icon={<ArrowUpwardIcon />} openIcon={<ArrowDownwardIcon />} />}
            >
                <ClearSelection />
                <HideSelected />
                <ViewOnlySelected />
                <SelectionColor />
                <MultipleSelection />
                <ToggleSubtrees />
            </SpeedDial>
        </Box>
    );
}
