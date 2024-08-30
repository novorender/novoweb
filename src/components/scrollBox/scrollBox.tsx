import { Box, BoxProps, css, styled, Theme } from "@mui/material";
import { OverridableComponent } from "@mui/material/OverridableComponent";
import { BoxTypeMap } from "@mui/system";
import { ForwardedRef, forwardRef } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { selectNewDesign } from "slices/explorer";

import { withCustomScrollbar } from "./withCustomScrollbar";

export const ScrollBox = withCustomScrollbar(Box) as OverridableComponent<
    BoxTypeMap<{ horizontal?: boolean }, "div", Theme>
>;

const ScrollBoxWidthBottomBorderRadius = styled(ScrollBox)(
    ({ theme }) => css`
        border-bottom-right-radius: ${theme.customShape.hudPanelBorderRadius}px;
        border-bottom-left-radius: ${theme.customShape.hudPanelBorderRadius}px;
    `
);

/**
 * Whenever ScrollBox is in the widget bottom - to avoid messing with widget bottom border radius
 */
export const WidgetBottomScrollBox = forwardRef(function WidgetBottomScrollBox(
    props: BoxProps,
    ref: ForwardedRef<HTMLDivElement>
) {
    const newDesign = useAppSelector(selectNewDesign);

    return newDesign ? <ScrollBoxWidthBottomBorderRadius {...props} ref={ref} /> : <ScrollBox {...props} ref={ref} />;
});
