import {
    AccordionSummary as MuiAccordionSummary,
    AccordionSummaryProps,
    styled,
    accordionSummaryClasses,
} from "@mui/material";
import { css } from "@mui/styled-engine";

import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export const AccordionSummary = styled((props: AccordionSummaryProps) => (
    <MuiAccordionSummary expandIcon={<ExpandMoreIcon />} {...props} />
))(
    ({ theme }) => css`
        padding: ${theme.spacing(1)};
        border-bottom: 1px solid ${theme.palette.grey[200]};
        min-height: 0;

        &:hover {
            background: ${theme.palette.grey[200]};
        }

        &.${accordionSummaryClasses.expanded} {
            min-height: 0;
            border-bottom: 0;

            &:hover {
                background: ${theme.palette.grey[300]};
            }
        }

        & .${accordionSummaryClasses.content} {
            min-height: 38px;
            margin: 0;
            display: flex;
            align-items: center;
            overflow: hidden;

            &.${accordionSummaryClasses.expanded} {
                margin: 0;
            }
        }
    `
);
