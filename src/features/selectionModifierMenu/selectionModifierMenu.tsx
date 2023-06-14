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
import { ArrowUpward, ArrowDownward } from "@mui/icons-material";

import { useAppDispatch, useAppSelector } from "app/store";
import { useToggle } from "hooks/useToggle";
import { renderActions, selectMainObject } from "features/render";
import { ToggleSubtrees } from "features/toggleSubtrees";
import { MultipleSelection } from "features/multipleSelection";
import { SelectionColor } from "features/selectionColor";
import { ViewOnlySelected } from "features/viewOnlySelected";
import { HideSelected } from "features/hideSelected";
import { ClearSelection } from "features/clearSelection";

export function SelectionModifierMenu() {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
    const [interacted, toggleInteracted] = useToggle(isSmall);
    const mainObject = useAppSelector(selectMainObject);
    const [open, toggle] = useToggle();
    const dispatch = useAppDispatch();

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
                open={open}
                onOpen={(_event, reason) => handleToggle(reason)}
                onClose={(_event, reason) => handleToggle(reason)}
                ariaLabel="selection modifiers"
                FabProps={
                    {
                        color: "secondary",
                        size: isSmall ? "small" : "large",
                    } as Partial<FabProps<"button">>
                }
                icon={<SpeedDialIcon icon={<ArrowUpward />} openIcon={<ArrowDownward />} />}
                onClick={() => dispatch(renderActions.setStamp(null))}
            >
                {/* <ClearView /> TODO */}
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
