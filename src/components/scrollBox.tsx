import { Box, BoxProps, createStyles, makeStyles } from "@material-ui/core";

export const useScrollBoxStyles = makeStyles((theme) =>
    createStyles({
        box: {
            scrollbarColor: `${theme.palette.grey[400]} transparent`,
            scrollbarWidth: "thin",
            overflow: "hidden overlay",
            fallbacks: {
                overflow: "hidden auto",
            },

            "&::-webkit-scrollbar": {
                width: "6px",
            },
            "&::-webkit-scrollbar-track": {
                "-webkit-box-shadow": "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
                backgroundColor: theme.palette.grey[400],
                borderRadius: "10px",
            },
        },
    })
);

export function ScrollBox(props: BoxProps) {
    const classes = useScrollBoxStyles();

    return <Box {...props} className={`${classes.box} ${props.className ?? ""}`} />;
}
