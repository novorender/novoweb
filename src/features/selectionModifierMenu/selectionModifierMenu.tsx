import { ArrowDownward, ArrowUpward } from "@mui/icons-material";
import {
    Box,
    CloseReason,
    FabProps,
    OpenReason,
    SpeedDial,
    SpeedDialIcon,
    useMediaQuery,
    useTheme,
} from "@mui/material";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { ClearSelection } from "features/clearSelection";
import { ClearView } from "features/clearView";
import { HideSelected } from "features/hideSelected";
import { MultipleSelection } from "features/multipleSelection";
import { renderActions, selectMainObject } from "features/render";
import { SelectionColor } from "features/selectionColor";
import { ToggleSubtrees } from "features/toggleSubtrees";
import { ViewOnlySelected } from "features/viewOnlySelected";
import { useToggle } from "hooks/useToggle";

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
                <ClearView />
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
