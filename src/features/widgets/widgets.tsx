import { useEffect } from "react";
import { Box, useMediaQuery, useTheme } from "@mui/material";

import { explorerActions, selectWidgets } from "slices/explorerSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { MenuWidget, Widget } from "features/widget";

export function Widgets() {
    const theme = useTheme();
    const isSmall = useMediaQuery(
        `@media (max-width: ${theme.breakpoints.values.sm}px), (max-height: ${theme.customBreakPoints.height.sm}px)`
    );

    const slots = useAppSelector(selectWidgets);
    const dispatch = useAppDispatch();

    useEffect(
        function handleScreenSizeChange() {
            if (isSmall && slots.length > 1) {
                dispatch(explorerActions.removeWidgetSlot(slots[1]));
            }
        },
        [isSmall, slots, dispatch]
    );

    return (
        <Box
            display="flex"
            flexDirection="column"
            alignItems="flex-end"
            justifyContent="flex-end"
            height={1}
            width={{ xs: "auto", md: "100%" }}
        >
            {(isSmall && slots.length < 1) || (!isSmall && slots.length < 2) ? <MenuWidget /> : null}
            {slots
                .slice(0)
                .reverse()
                .map((key) => (
                    <Widget key={key} widgetKey={key} />
                ))}
        </Box>
    );
}
