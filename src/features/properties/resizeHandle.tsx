import { css, styled } from "@mui/material";

export const ResizeHandle = styled("div")(
    () => css`
        padding: 0 4px;
        cursor: col-resize;
        touch-action: none;
    `
);
