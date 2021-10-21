import { LinearProgress as MuiLinearProgress, linearProgressClasses, LinearProgressProps, styled } from "@mui/material";
import { css } from "@mui/styled-engine";

export const LinearProgress = styled((props: LinearProgressProps) => (
    <MuiLinearProgress data-test="loading-bar" {...props} />
))(
    () => css`
        &.${linearProgressClasses.root} {
            position: absolute;
            width: 100%;
            z-index: 1;
        }
    `
);
