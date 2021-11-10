import { css } from "@mui/styled-engine";
import { styled, Box, BoxProps, iconButtonClasses } from "@mui/material";

export const WidgetMenuButtonWrapper = styled(Box, {
    shouldForwardProp: (prop: string) => !["activeCurrent", "activeElsewhere"].includes(prop),
})<BoxProps & { activeCurrent?: boolean; activeElsewhere?: boolean }>(
    ({ activeCurrent, activeElsewhere, theme }) => css`
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        opacity: ${activeElsewhere ? 0.3 : 1};

        &:hover .${iconButtonClasses.root}:not(:disabled) {
            background: ${activeCurrent ? theme.palette.primary.dark : theme.palette.grey[300]};
        }

        .${iconButtonClasses.root} {
            background: ${activeCurrent ? theme.palette.primary.main : theme.palette.grey[100]};

            svg,
            svg path {
                fill: ${activeCurrent ? theme.palette.common.white : theme.palette.text.primary};
            }
        }
    `
);
