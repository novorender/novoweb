import { Paper, PaperProps, styled, css } from "@mui/material";

type StyleProps = {
    minimized?: boolean;
    maximized?: boolean;
};

export const WidgetContainer = styled((props: PaperProps) => <Paper elevation={4} {...props} />, {
    shouldForwardProp: (prop) => prop !== "minimized" && prop !== "maximized",
})<StyleProps>(
    ({ theme, minimized, maximized }) => css`
        pointer-events: auto;
        border-radius: ${theme.shape.borderRadius}px;
        height: ${minimized ? "auto" : "100%"};
        position: absolute;
        left: ${theme.spacing(1)};
        right: ${theme.spacing(1)};
        top: ${theme.spacing(1)};
        display: flex;
        flex-direction: column;
        z-index: 1051;

        ${theme.breakpoints.up("sm")} {
            min-width: 384px;
            max-width: 20vw;
            width: 100%;
            min-height: min(365px, 100%);
            position: static;
            transform: translateX(-20px) translateY(40px);
        }

        ${theme.breakpoints.up("md")} {
            transform: translateX(-30px) translateY(46px);
        }

        ${maximized
            ? css`
                  max-height: calc(100% - ${theme.spacing(2)});
                  bottom: ${theme.spacing(1)};
              `
            : css`
                  max-height: min(50vh, 400px);

                  ${theme.breakpoints.up("sm")} {
                      max-height: calc(50% - 80px);
                  }
              `}
    `
);
