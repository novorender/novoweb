import { Box, styled } from "@mui/material";
import { css } from "@mui/system";

export const withCustomScrollbar = (component: any): unknown =>
    styled(component)(
        ({ theme }) => css`
            scrollbar-color: ${theme.palette.grey[400]} transparent;
            scrollbar-width: thin;
            overflow: hidden auto;
            overflow: hidden overlay;

            &::-webkit-scrollbar {
                width: 6px;
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

export const ScrollBox = withCustomScrollbar(Box) as typeof Box;
