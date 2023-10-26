import { css, styled, Tooltip as MuiTooltip, tooltipClasses, TooltipProps } from "@mui/material";

export const Tooltip = styled(({ className, ...props }: TooltipProps) => (
    <MuiTooltip
        placement="bottom-start"
        enterDelay={800}
        enterNextDelay={500}
        {...props}
        classes={{ popper: className }}
    />
))(
    ({ theme }) => css`
        & .${tooltipClasses.tooltip} {
            background-color: ${theme.palette.common.white};
            color: ${theme.palette.text.primary};
            box-shadow: ${theme.shadows[1]};
            font-size: 16px;
            padding: ${theme.spacing(2)};
            max-width: min(100vw, 420px);
        }
    `
);
