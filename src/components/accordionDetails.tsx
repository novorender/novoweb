import { AccordionDetails as MuiAccordionDetails, AccordionDetailsProps } from "@mui/material";

import createStyles from "@mui/styles/createStyles";
import makeStyles from "@mui/styles/makeStyles";

const useStyles = makeStyles((theme) =>
    createStyles({
        accordionDetails: {
            padding: `0 0 ${theme.spacing(1)} 0`,
            display: "block",
        },
    })
);

export function AccordionDetails(props: AccordionDetailsProps) {
    const classes = useStyles();

    return (
        <MuiAccordionDetails
            {...props}
            className={props.className ? `${props.className} ${classes.accordionDetails}` : classes.accordionDetails}
        />
    );
}
