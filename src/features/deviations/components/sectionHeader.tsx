import { css, styled, Typography } from "@mui/material";

export const SectionHeader = styled(Typography)(
    ({ theme }) => css`
        font-weight: 600;
        margin-top: ${theme.spacing(3)};
        margin-bottom: ${theme.spacing(1)};
    `
);
