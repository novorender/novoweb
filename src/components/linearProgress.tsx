import { LinearProgress as MuiLinearProgress, LinearProgressProps } from "@mui/material";

import createStyles from "@mui/styles/createStyles";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme) =>
    createStyles({
        root: {
            position: "absolute",
            width: "100%",
            zIndex: 1,
        },
        bar: {
            backgroundColor: theme.palette.primary.main,
        },
    })
);

export function LinearProgress(props: LinearProgressProps) {
    const classes = useStyles();

    return (
        <MuiLinearProgress
            data-test="loading-bar"
            {...props}
            classes={{ bar: classes.bar, root: classes.root, ...props.classes }}
        />
    );
}
