import { useMediaQuery, useTheme } from "@mui/material";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { explorerActions, selectNewDesign } from "slices/explorer";

export function useHandleWidgetLayout() {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const newDesign = useAppSelector(selectNewDesign);
    const xNarrow = useMediaQuery(`@media (max-width: ${theme.breakpoints.values.sm}px)`);
    const narrow = useMediaQuery(`@media (max-width: ${theme.breakpoints.values.xl}px)`);
    const mdNarrow = useMediaQuery(`@media (max-width: ${theme.breakpoints.values.md}px)`);
    const lgNarrow = useMediaQuery(`@media (max-width: ${theme.breakpoints.values.lg}px)`);
    const lg2Narrow = useMediaQuery(`@media (max-width: ${theme.customBreakPoints.width.lg2}px)`);
    const xShort = useMediaQuery(`@media (max-height: ${theme.breakpoints.values.sm}px)`);
    const short = useMediaQuery(`@media (max-height: ${theme.breakpoints.values.xl}px)`);

    useEffect(() => {
        if (newDesign) {
            if (xNarrow) {
                dispatch(
                    explorerActions.setWidgetLayout({
                        widgets: 1,
                        sideBySide: false,
                        padWidgetsTop: false,
                    })
                );
            } else if (xShort) {
                dispatch(
                    explorerActions.setWidgetLayout({
                        widgets: 1,
                        sideBySide: true,
                        padWidgetsTop: false,
                    })
                );
            } else if (mdNarrow) {
                dispatch(
                    explorerActions.setWidgetLayout({
                        widgets: 2,
                        sideBySide: true,
                        padWidgetsTop: true,
                    })
                );
            } else if (lg2Narrow) {
                dispatch(
                    explorerActions.setWidgetLayout({
                        widgets: 4,
                        sideBySide: true,
                        padWidgetsTop: true,
                    })
                );
            } else {
                dispatch(
                    explorerActions.setWidgetLayout({
                        widgets: 4,
                        sideBySide: true,
                        padWidgetsTop: false,
                    })
                );
            }
        } else {
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
        }
    }, [dispatch, newDesign, xNarrow, narrow, mdNarrow, lgNarrow, lg2Narrow, xShort, short]);
}
