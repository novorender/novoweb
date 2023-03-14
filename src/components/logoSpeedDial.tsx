import { SyntheticEvent } from "react";
import { Close } from "@mui/icons-material";
import {
    Box,
    CloseReason,
    FabProps,
    OpenReason,
    SpeedDial,
    speedDialClasses,
    SpeedDialIcon,
    SpeedDialProps,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import { ReactComponent as NovorenderIcon } from "media/icons/novorender-small.svg";

export function LogoSpeedDial({
    open,
    toggle,
    ariaLabel = "toggle widget menu",
    ...props
}: Omit<SpeedDialProps, "ariaLabel"> & { ariaLabel?: string; toggle: () => void }) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));

    const handleToggle = (_event: SyntheticEvent<{}, Event>, reason: OpenReason | CloseReason) => {
        if (!["toggle", "escapeKeyDown"].includes(reason)) {
            return;
        }

        toggle();
    };

    return (
        <Box position="relative">
            <SpeedDial
                {...props}
                ariaLabel={ariaLabel}
                open={open}
                onOpen={handleToggle}
                onClose={handleToggle}
                sx={{
                    position: "absolute",
                    bottom: isSmall ? -20 : -28,
                    right: isSmall ? -20 : -28,
                    zIndex: 1052,
                    ...props.sx,

                    [`.${speedDialClasses.actions}`]: {
                        padding: 0,
                    },
                }}
                FabProps={
                    {
                        ...props.FabProps,
                        color: open ? "secondary" : "primary",
                        size: isSmall ? "small" : "large",
                    } as Partial<FabProps<"button">>
                }
                icon={<SpeedDialIcon icon={<NovorenderIcon />} openIcon={<Close />} />}
            />
        </Box>
    );
}
