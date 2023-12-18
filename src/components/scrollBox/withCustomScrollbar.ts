import { styled } from "@mui/material";
import { css } from "@mui/styled-engine";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const withCustomScrollbar = (component: any): any =>
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
