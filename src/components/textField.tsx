import { createStyles, TextField as MuiTextField, Theme, makeStyles, TextFieldProps } from "@material-ui/core";

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
            variant="outlined"
            size="small"
            {...props}
            classes={{
                root: classes.root,
            }}
            InputProps={{ ...props.InputProps, classes: { ...props.InputProps?.classes, root: classes.InputRoot } }}
        />
    );
}
