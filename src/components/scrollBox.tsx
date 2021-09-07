import { Box, BoxProps, createStyles, makeStyles } from "@material-ui/core";
import { forwardRef } from "react";

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

export const ScrollBox = forwardRef<HTMLDivElement, BoxProps>((props, ref) => {
    const classes = useScrollBoxStyles();

    // prettier-ignore
    return (
        <Box
            {...props}
            // @ts-ignore mis-typing in library
            ref={ref}
            className={`${classes.box} ${props.className ?? ""}`}
        />
    );
});
