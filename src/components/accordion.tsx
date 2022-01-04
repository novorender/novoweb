import { Accordion as MuiAccordion, accordionClasses, styled } from "@mui/material";
import { css } from "@mui/styled-engine";

export const Accordion = styled(MuiAccordion)(
    ({ theme }) => css`
        box-shadow: none;
        padding: 0;
        margin: 0;

        &::before {
            display: none;
        }

        &.${accordionClasses.root} {
            &.${accordionClasses.expanded} {
                margin: 0 0 ${theme.spacing(1)};
            }
        }

        &.${accordionClasses.expanded} {
            background: ${theme.palette.grey[100]};
            margin: 0;
        }
    `
);
