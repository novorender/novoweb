import { css, Paper, PaperProps, styled } from "@mui/material";
import { ForwardedRef, forwardRef } from "react";

export const HudPanel = styled(
    forwardRef((props: PaperProps, ref: ForwardedRef<HTMLDivElement>) => <Paper ref={ref} elevation={0} {...props} />)
)(
    ({ theme }) => css`
        border-radius: ${theme.customShape.hudPanelBorderRadius}px;
        z-index: 1050;
        padding: ${theme.spacing(1)};
    `
);
