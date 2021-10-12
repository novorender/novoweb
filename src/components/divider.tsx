import { Divider as MuiDivider, DividerProps } from "@mui/material";

import createStyles from "@mui/styles/createStyles";
import makeStyles from "@mui/styles/makeStyles";

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
