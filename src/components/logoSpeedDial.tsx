import { Close } from "@mui/icons-material";
import {
    Box,
    FabProps,
    SpeedDial,
    speedDialClasses,
    SpeedDialIcon,
    SpeedDialProps,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import { useAppDispatch, useAppSelector } from "app";
import { renderActions } from "features/render";
import NovorenderIcon from "media/icons/novorender-small.svg?react";
import { selectIsOnline } from "slices/explorer";

export function LogoSpeedDial({
    open,
    toggle,
    ariaLabel = "toggle widget menu",
    ...props
}: Omit<SpeedDialProps, "ariaLabel"> & { ariaLabel?: string; toggle: () => void }) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
    const isOnline = useAppSelector(selectIsOnline);
    const dispatch = useAppDispatch();

    const handleToggle: SpeedDialProps["onOpen"] & SpeedDialProps["onClose"] = (_event, reason) => {
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
                        color: open ? (isOnline ? "secondary" : "primary") : isOnline ? "primary" : "secondary",
                        size: isSmall ? "small" : "large",
                    } as Partial<FabProps<"button">>
                }
                icon={<SpeedDialIcon icon={<NovorenderIcon />} openIcon={<Close />} />}
                onClick={() => dispatch(renderActions.setStamp(null))}
            />
        </Box>
    );
}
