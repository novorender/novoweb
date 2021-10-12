import { Accordion as MuiAccordion, AccordionProps } from "@mui/material";

import createStyles from "@mui/styles/createStyles";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme) =>
    createStyles({
        accordionRoot: {
            padding: `0`,
            "&::before": {
                display: "none",
            },
            "&.Mui-expanded": {
                margin: `0 0 ${theme.spacing(1)}`,
            },
            "&.MuiPaper-elevation1": {
                boxShadow: "none",
            },
        },
        accordionExpanded: {
            background: theme.palette.grey[200],
            margin: 0,
        },
    })
);

export function Accordion(props: AccordionProps) {
    const classes = useStyles();

    return (
        <MuiAccordion
            {...props}
            classes={{ root: classes.accordionRoot, expanded: classes.accordionExpanded, ...props.classes }}
        />
    );
}
