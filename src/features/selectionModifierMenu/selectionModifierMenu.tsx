import { useEffect } from "react";
import { useTheme, useMediaQuery, FabProps } from "@material-ui/core";
import { CloseReason, OpenReason, SpeedDial, SpeedDialIcon } from "@material-ui/lab";

import { MultipleSelection } from "features/multipleSelection";
import { ClearSelection } from "features/clearSelection";
import { ViewOnlySelected } from "features/viewOnlySelected";
import { SelectionColor } from "features/selectionColor";
import { HideSelected } from "features/hideSelected";
import { useAppSelector } from "app/store";
import { useToggle } from "hooks/useToggle";
import { selectMainObject } from "slices/renderSlice";

import ArrowUpwardIcon from "@material-ui/icons/ArrowUpward";
import ArrowDownwardIcon from "@material-ui/icons/ArrowDownward";

export function SelectionModifierMenu() {
    const [interacted, toggleInteracted] = useToggle();
    const mainObject = useAppSelector(selectMainObject);
    const [open, toggle] = useToggle();
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

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
        </SpeedDial>
    );
}
