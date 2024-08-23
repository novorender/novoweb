import { css, Paper, PaperProps, styled, useTheme } from "@mui/material";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { renderActions } from "features/render";
import { selectNewDesign } from "slices/explorer";

type StyleProps = {
    minimized?: boolean;
    maximized?: boolean;
};

const ConnectedPaper = (props: PaperProps) => {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const newDesign = useAppSelector(selectNewDesign);

    return (
        <Paper
            elevation={4}
            sx={{ borderRadius: `${newDesign ? theme.customShape.hudPanelBorderRadius : theme.shape.borderRadius}px` }}
            {...props}
            onClick={() => dispatch(renderActions.setStamp(null))}
        />
    );
};

export const WidgetContainer = styled(ConnectedPaper, {
    shouldForwardProp: (prop) => prop !== "minimized" && prop !== "maximized",
})<StyleProps>(
    ({ theme, minimized, maximized }) => css`
        pointer-events: auto;
        height: ${minimized ? "auto" : "100%"};
        min-height: 0px;
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
