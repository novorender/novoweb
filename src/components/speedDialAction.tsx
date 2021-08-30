import { createStyles, makeStyles } from "@material-ui/core";
import { SpeedDialAction as BaseSpeedDialAction, SpeedDialActionProps } from "@material-ui/lab";
import { forwardRef } from "react";

type Props = SpeedDialActionProps & {
    active?: boolean;
};

const useStyles = makeStyles((theme) =>
    createStyles({
        base: {
            [theme.breakpoints.down("sm")]: {
                margin: theme.spacing(1),
                marginBottom: 0,
            },
        },
        fabActive: {
            backgroundColor: theme.palette.brand.main,
            "&:hover": {
                backgroundColor: theme.palette.brand.dark,
            },
        },
        fab: {
            backgroundColor: theme.palette.secondary.main,
            "&:hover": {
                backgroundColor: theme.palette.secondary.dark,
            },
        },
    })
);

export const SpeedDialAction = forwardRef(({ active, ...speedDialActionProps }: Props, ref) => {
    const classes = useStyles();

    return (
        <BaseSpeedDialAction
            ref={ref}
            className={classes.base}
            classes={{ fab: active ? classes.fabActive : classes.fab }}
            {...speedDialActionProps}
        />
    );
});
