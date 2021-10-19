import { Divider as MuiDivider, styled } from "@mui/material";
import { css } from "@mui/styled-engine";

export const Divider = styled(MuiDivider)(
    ({ theme }) => css`
        border-color: ${theme.palette.grey[100]};
    `
);
