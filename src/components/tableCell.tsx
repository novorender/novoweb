import { css, styled, TableCell as MuiTableCell, TableCellProps } from "@mui/material";

export const TableCell = styled(MuiTableCell, { shouldForwardProp: (prop) => prop !== "bold" })<
    TableCellProps & { bold?: boolean }
>(
    ({ bold, theme }) => css`
        font-weight: ${bold ? 600 : 400};
        line-height: 1.6em;
        padding: ${theme.spacing(0.5)} ${theme.spacing(1)};

        &:first-of-type {
            padding-left: 0;
        }
    `
);
