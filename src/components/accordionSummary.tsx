import { AccordionSummary as MuiAccordionSummary, AccordionSummaryProps, makeStyles } from "@material-ui/core";

import ExpandMoreIcon from "@material-ui/icons/ExpandMore";

const useStyles = makeStyles((theme) => ({
    accordionSummaryRoot: {
        padding: `0 ${theme.spacing(1)}px`,
        borderBottom: `1px solid ${theme.palette.grey[200]}`,

        "&:hover": {
            background: theme.palette.grey[200],
        },

        "&.Mui-expanded": {
            minHeight: 0,
            borderBottom: 0,

            "&:hover": {
                background: theme.palette.grey[300],
            },
        },
    },
    accordionSummaryContent: {
        display: "flex",
        alignItems: "center",
        margin: 0,
        overflow: "hidden",
    },
    accordionSummaryExpanded: {
        "& .MuiAccordionSummary-content": {
            margin: 0,
        },
    },
    expandIcon: {
        paddingLeft: 0,
        paddingRight: 0,
        marginRight: 0,
    },
}));

export function AccordionSummary(props: AccordionSummaryProps) {
    const classes = useStyles();

    return (
        <MuiAccordionSummary
            expandIcon={<ExpandMoreIcon />}
            {...props}
            classes={{
                root: classes.accordionSummaryRoot,
                content: classes.accordionSummaryContent,
                expanded: classes.accordionSummaryExpanded,
                expandIcon: classes.expandIcon,
                ...props.classes,
            }}
        />
    );
}
