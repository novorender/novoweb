import { SpeedDialAction as MuiSpeedDialAction, SpeedDialActionProps, styled } from "@mui/material";
import { forwardRef } from "react";
import { css } from "@mui/styled-engine";

export const SpeedDialAction = styled(
    forwardRef(({ FabProps, ...speedDialActionProps }: SpeedDialActionProps, ref) => (
        <MuiSpeedDialAction ref={ref} {...speedDialActionProps} FabProps={{ color: "inherit", ...FabProps }} />
    )),
    { shouldForwardProp: (prop) => prop !== "active" }
)<SpeedDialActionProps & { active?: boolean }>(
    ({ active, theme }) => css`
        ${theme.breakpoints.down("md")} {
            margin: ${theme.spacing(1)} ${theme.spacing(1)} 0;
        }

        &,
        svg {
            color: ${theme.palette.common.white};
        }

        background-color: ${active ? theme.palette.primary.main : theme.palette.secondary.main};

        &:hover {
            background-color: ${active ? theme.palette.primary.dark : theme.palette.secondary.dark};
        }
    `
);
