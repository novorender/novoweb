import { css, styled } from "@mui/material";

export const ChartHeaderButton = styled("button", {
    shouldForwardProp: (prop) => prop !== "active",
})<React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement> & { active?: boolean }>(
    ({ theme, active }) => css`
        border: 0;
        opacity: 0.7;
        background: ${active ? theme.palette.grey[400] : "transparent"};
        cursor: pointer;

        &:hover {
            background: ${active ? theme.palette.grey[500] : theme.palette.grey[200]};
        }
    `
);
