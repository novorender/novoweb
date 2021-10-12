import { Switch as MuiSwitch, Theme } from "@mui/material";

import createStyles from "@mui/styles/createStyles";
import withStyles from "@mui/styles/withStyles";

export const Switch = withStyles((theme: Theme) =>
    createStyles({
        root: {
            width: 28,
            height: 16,
            padding: 0,
            display: "flex",
        },
        switchBase: {
            padding: 2,
            color: theme.palette.grey[500],
            "&$checked": {
                transform: "translateX(12px)",
                color: theme.palette.common.white,
                "& + $track": {
                    opacity: 1,
                    backgroundColor: theme.palette.primary.main,
                    borderColor: theme.palette.primary.main,
                },
            },
        },
        thumb: {
            width: 12,
            height: 12,
            boxShadow: "none",
            color: theme.palette.common.white,
        },
        track: {
            border: `1px solid ${theme.palette.grey[500]}`,
            borderRadius: 16 / 2,
            opacity: 1,
            backgroundColor: theme.palette.grey[500],
        },
        checked: {},
    })
)(MuiSwitch);
