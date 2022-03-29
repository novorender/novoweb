import { Paper, PaperProps, styled, css } from "@mui/material";

type StyleProps = {
    minimized?: boolean;
};

export const WidgetContainer = styled((props: PaperProps) => <Paper elevation={4} {...props} />, {
    shouldForwardProp: (prop) => prop !== "minimized",
})<StyleProps>(
    ({ theme, minimized }) => css`
        pointer-events: auto;
        border-radius: ${theme.shape.borderRadius}px;
        max-height: min(50vh, 400px);
        height: ${minimized ? "auto" : "100%"};
        position: absolute;
        left: ${theme.spacing(1)};
        right: ${theme.spacing(1)};
        top: ${theme.spacing(1)};
        display: flex;
        flex-direction: column;

        ${theme.breakpoints.up("sm")} {
            min-width: 384px;
            max-width: 20vw;
            width: 100%;
            min-height: 350px;
            max-height: calc(50% - 80px);
            position: static;
            transform: translateX(-20px) translateY(40px);
        }

        ${theme.breakpoints.up("md")} {
            transform: translateX(-30px) translateY(46px);
        }
    `
);
