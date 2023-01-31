import { css } from "@mui/styled-engine";
import { styled, Box, BoxProps, iconButtonClasses, alpha } from "@mui/material";

export const WidgetMenuButtonWrapper = styled(Box, {
    shouldForwardProp: (prop: string) => !["activeCurrent", "activeElsewhere", "activeTag"].includes(prop),
})<BoxProps & { activeCurrent?: boolean; activeElsewhere?: boolean; activeTag?: boolean }>(
    ({ activeCurrent, activeElsewhere, activeTag, theme }) => css`
        display: flex;
        flex-direction: column;
        align-items: center;
        cursor: pointer;
        opacity: ${activeElsewhere ? 0.3 : 1};

        &:hover .${iconButtonClasses.root}:not(:disabled) {
            background: ${activeCurrent || activeTag ? theme.palette.primary.dark : theme.palette.grey[300]};
        }

        .${iconButtonClasses.root} {
            background: ${activeCurrent
                ? theme.palette.primary.main
                : activeTag
                ? alpha(theme.palette.primary.light, 0.75)
                : theme.palette.grey[100]};

            svg,
            svg path {
                fill: ${activeCurrent || activeTag ? theme.palette.common.white : theme.palette.text.primary};
            }
        }
    `
);
