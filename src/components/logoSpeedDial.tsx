import { SyntheticEvent } from "react";
import { Close } from "@mui/icons-material";
import {
    CloseReason,
    FabProps,
    OpenReason,
    SpeedDial,
    SpeedDialIcon,
    SpeedDialProps,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import { ReactComponent as NovorenderIcon } from "media/icons/novorender-small.svg";

export function LogoSpeedDial({
    open,
    toggle,
    testId,
    ...props
}: SpeedDialProps & { testId: string; toggle: () => void }) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));

    const handleToggle = (_event: SyntheticEvent<{}, Event>, reason: OpenReason | CloseReason) => {
        if (!["toggle", "escapeKeyDown"].includes(reason)) {
            return;
        }

        toggle();
    };

    return (
        <SpeedDial
            {...props}
            open={open}
            onOpen={handleToggle}
            onClose={handleToggle}
            FabProps={
                {
                    color: open ? "secondary" : "primary",
                    size: isSmall ? "small" : "large",
                    "data-test": testId,
                } as Partial<FabProps<"button", { "data-test": string }>>
            }
            icon={<SpeedDialIcon icon={<NovorenderIcon />} openIcon={<Close />} />}
        />
    );
}
