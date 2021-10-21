import { AccordionDetails as MuiAccordionDetails, styled } from "@mui/material";
import { css } from "@mui/styled-engine";

export const AccordionDetails = styled(MuiAccordionDetails)(
    ({ theme }) => css`
        padding: 0 0 ${theme.spacing(1)} 0;
        display: block;
    `
);
