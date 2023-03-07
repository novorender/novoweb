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
        max-height: min(50vh, 400px);
        position: absolute;
        left: ${theme.spacing(1)};
        right: ${theme.spacing(1)};
        top: ${theme.spacing(1)};
        display: flex;
        flex-direction: column;
        z-index: 1051;
        flex-grow: 1;

        // Needed to contain snackbars inside widget
        transform: translate(0px, 0px);

        ${theme.breakpoints.up("sm")} {
            width: 100%;
            position: static;
            max-height: 100%;
        }

        ${maximized
            ? css`
                  max-height: calc(100% - ${theme.spacing(2)});
                  bottom: ${theme.spacing(1)};

                  ${theme.breakpoints.up("sm")} {
                      max-height: 100%;
                  }
              `
            : ""}
    `
);
