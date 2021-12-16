import { Box, styled, BoxTypeMap } from "@mui/material";
import { OverridableComponent } from "@mui/material/OverridableComponent";
import { css } from "@mui/system";

export const withCustomScrollbar = (component: any): unknown =>
    styled(component, { shouldForwardProp: (prop) => prop !== "horizontal" })<{ horizontal?: boolean }>(
        ({ theme, horizontal }) => css`
            scrollbar-color: ${theme.palette.grey[400]} transparent;
            scrollbar-width: thin;
            overflow: ${horizontal ? `hidden hidden` : `hidden auto`};
            overflow: ${horizontal ? `overlay overlay` : `hidden overlay`};

            &::-webkit-scrollbar {
                width: 6px;
                height: 6px;
            }

            &::-webkit-scrollbar-track {
                box-shadow: transparent;
            }

            &::-webkit-scrollbar-thumb {
                background-color: ${theme.palette.grey[400]};
                border-radius: 10px;
            }
        `
    );

export const ScrollBox = withCustomScrollbar(Box) as OverridableComponent<BoxTypeMap<{ horizontal?: boolean }, "div">>;
