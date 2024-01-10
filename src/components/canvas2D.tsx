import { css, styled } from "@mui/material";

export const Canvas2D = styled("canvas")(
    () => css`
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    `
);
