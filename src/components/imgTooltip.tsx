import { TooltipProps, Box, tooltipClasses, styled, Tooltip as MuiTooltip } from "@mui/material";
import { css } from "@mui/styled-engine";
import { ImgHTMLAttributes, MouseEvent } from "react";

export const ImgTooltip = styled(
    ({
        className,
        src,
        title,
        onTooltipClick,
        imgProps,
        ...props
    }: Omit<TooltipProps, "title" | "children"> & {
        src: string;
        title?: TooltipProps["title"];
        onTooltipClick?: (e: MouseEvent<HTMLImageElement>) => void;
        imgProps?: ImgHTMLAttributes<unknown>;
    }) => (
        <MuiTooltip
            placement="bottom-end"
            title={
                title ?? (
                    <Box sx={{ height: 176, width: 176, cursor: "pointer" }}>
                        <Img onClick={onTooltipClick} alt="" src={src} />
                    </Box>
                )
            }
            {...props}
            classes={{ popper: className }}
        >
            <Img alt="" height="32px" width="32px" {...imgProps} src={src} />
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
