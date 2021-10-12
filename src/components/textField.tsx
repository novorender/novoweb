import { TextField as MuiTextField, Theme, TextFieldProps } from "@mui/material";

import createStyles from "@mui/styles/createStyles";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            "& label.Mui-focused": {
                color: theme.palette.info.main,
            },
            "& .MuiOutlinedInput-root": {
                "&:hover fieldset": {
                    borderColor: theme.palette.info.light,
                },
                "&.Mui-focused fieldset": {
                    borderColor: theme.palette.info.main,
                },
            },
        },
        InputRoot: {
            fontSize: 14,
        },
    })
);

export function TextField(props: TextFieldProps) {
    const classes = useStyles();

    return (
        <MuiTextField
            size="small"
            {...props}
            classes={{
                root: classes.root,
            }}
            InputProps={{ ...props.InputProps, classes: { ...props.InputProps?.classes, root: classes.InputRoot } }}
        />
    );
}
