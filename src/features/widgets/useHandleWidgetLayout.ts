import { useMediaQuery, useTheme } from "@mui/material";
import { useEffect } from "react";

import { useAppDispatch } from "app";
import { explorerActions } from "slices/explorer";

export function useHandleWidgetLayout() {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const xNarrow = useMediaQuery(`@media (max-width: ${theme.breakpoints.values.sm}px)`);
    const narrow = useMediaQuery(`@media (max-width: ${theme.breakpoints.values.xl}px)`);
    const xShort = useMediaQuery(`@media (max-height: ${theme.breakpoints.values.sm}px)`);
    const short = useMediaQuery(`@media (max-height: ${theme.breakpoints.values.xl}px)`);

    useEffect(() => {
        if (xNarrow) {
            dispatch(
                explorerActions.setWidgetLayout({
                    widgets: 1,
                    sideBySide: false,
                })
            );
        } else if (xShort) {
            dispatch(
                explorerActions.setWidgetLayout({
                    widgets: 1,
                    sideBySide: true,
                })
            );
        } else if (narrow) {
            dispatch(
                explorerActions.setWidgetLayout({
                    widgets: 2,
                    sideBySide: true,
                })
            );
        } else {
            dispatch(
                explorerActions.setWidgetLayout({
                    widgets: 4,
                    sideBySide: true,
                })
            );
        }
    }, [dispatch, xNarrow, narrow, xShort, short]);
}
