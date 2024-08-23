import { Box, BoxProps, css, styled, Theme } from "@mui/material";
import { OverridableComponent } from "@mui/material/OverridableComponent";
import { BoxTypeMap } from "@mui/system";

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
export function WidgetBottomScrollBox(props: BoxProps) {
    const newDesign = useAppSelector(selectNewDesign);

    return newDesign ? <ScrollBoxWidthBottomBorderRadius {...props} /> : <ScrollBox {...props} />;
}
