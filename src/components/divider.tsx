import { createStyles, Divider as MuiDivider, DividerProps, makeStyles } from "@material-ui/core";

const useStyles = makeStyles((theme) =>
    createStyles({
        default: {
            borderColor: theme.palette.grey[100],
        },
    })
);

export function Divider(props: DividerProps) {
    const classes = useStyles();

    return (
        <MuiDivider
            {...props}
            className={props.className ? `${props.className} ${classes.default}` : classes.default}
        />
    );
}
