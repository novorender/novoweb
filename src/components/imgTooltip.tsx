import { TooltipProps, Box, tooltipClasses, styled, Tooltip as MuiTooltip } from "@mui/material";
import { css } from "@mui/styled-engine";

export const ImgTooltip = styled(
    ({
        className,
        src,
        title,
        ...props
    }: Omit<TooltipProps, "title" | "children"> & { src: string; title?: TooltipProps["title"] }) => (
        <MuiTooltip
            placement="bottom-end"
            title={
                title ?? (
                    <Box sx={{ height: 176, width: 176, cursor: "pointer" }}>
                        <Img alt="" src={src} />
                    </Box>
                )
            }
            {...props}
            classes={{ popper: className }}
        >
            <Img alt="" height="32px" width="32px" src={src} />
        </MuiTooltip>
    )
)(
    ({ theme }) => css`
        & .${tooltipClasses.tooltip} {
            max-width: none;
            background: ${theme.palette.common.white};
            padding: ${theme.spacing(1)};
            border-radius: 4px;
            border: 1px solid ${theme.palette.grey.A400};
        }
    `
);

const Img = styled("img")(
    () => css`
        height: 100%;
        width: 100%;
        object-fit: cover;
        display: block;
    `
);
