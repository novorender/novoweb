import { createStyles, LinearProgress as MuiLinearProgress, LinearProgressProps, makeStyles } from "@material-ui/core";

const useStyles = makeStyles((theme) =>
    createStyles({
        root: {
            position: "absolute",
            width: "100%",
            zIndex: 1,
        },
        bar: {
            backgroundColor: theme.palette.brand?.main ?? theme.palette.primary.main,
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
