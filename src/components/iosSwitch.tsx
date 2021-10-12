import { Theme, Switch } from "@mui/material";

import withStyles from "@mui/styles/withStyles";
import createStyles from "@mui/styles/createStyles";

export const IosSwitch = withStyles((theme: Theme) =>
    createStyles({
        root: {
            width: 48,
            height: 24,
            padding: 0,
            margin: theme.spacing(1),
        },
        switchBase: {
            padding: 1,
            color: theme.palette.grey[600],

            "&$checked": {
                transform: "translateX(23px)",
                color: theme.palette.primary.main,

                "& + $track": {
                    opacity: 0.1,
                },
            },
        },
        thumb: {
            marginTop: 2,
            marginLeft: 3,
            width: 18,
            height: 18,
        },
        track: {
            borderRadius: 24 / 2,
            color: theme.palette.grey[600],
            opacity: 0.1,
        },
        checked: {},
    })
)(Switch);
