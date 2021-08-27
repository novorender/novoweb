import {
    AccordionDetails as MuiAccordionDetails,
    AccordionDetailsProps,
    createStyles,
    makeStyles,
} from "@material-ui/core";

const useStyles = makeStyles((theme) =>
    createStyles({
        accordionDetails: {
            padding: `0 0 ${theme.spacing(1)}px 0`,
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
