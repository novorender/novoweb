import { useMediaQuery, useTheme } from "@mui/material";
import { useEffect, useState } from "react";

export function useWidgetLayout() {
    const theme = useTheme();
    const xNarrow = useMediaQuery(`@media (max-width: ${theme.breakpoints.values.sm}px)`);
    const narrow = useMediaQuery(`@media (max-width: ${theme.breakpoints.values.md}px)`);
    const xShort = useMediaQuery(`@media (max-height: ${theme.breakpoints.values.sm}px)`);
    const short = useMediaQuery(`@media (max-height: ${theme.breakpoints.values.md}px)`);

    const [state, setState] = useState({
        widgets: 4,
        sideBySide: true,
    });

    useEffect(() => {
        if (xNarrow) {
            setState({
                widgets: 1,
                sideBySide: false,
            });
        } else if (xShort) {
            setState({
                widgets: 1,
                sideBySide: true,
            });
        } else if (narrow) {
            setState({
                widgets: 2,
                sideBySide: true,
            });
        } else {
            setState({
                widgets: 4,
                sideBySide: true,
            });
        }
    }, [xNarrow, narrow, xShort, short]);

    return state;
}
