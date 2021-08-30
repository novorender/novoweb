import { Box, useMediaQuery, useTheme } from "@material-ui/core";
import type { Scene, View } from "@novorender/webgl-api";

import { appActions, selectWidgets } from "slices/appSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { MenuWidget, Widget } from "features/widget";
import { useEffect } from "react";

type Props = { scene: Scene; view: View };

export function Widgets({ scene, view }: Props) {
    const theme = useTheme();
    const isSmall = useMediaQuery(
        `@media (max-width: ${theme.breakpoints.values.sm}px), (max-height: ${theme.customBreakPoints.height.sm}px)`
    );

    const slots = useAppSelector(selectWidgets);
    const dispatch = useAppDispatch();

    useEffect(
        function handleScreenSizeChange() {
            if (isSmall && slots.length > 1) {
                dispatch(appActions.removeWidgetSlot(slots[1]));
            }
        },
        [isSmall, slots, dispatch]
    );

    return (
        <Box display="flex" flexDirection="column" alignItems="flex-end">
            {(isSmall && slots.length < 1) || (!isSmall && slots.length < 2) ? <MenuWidget /> : null}
            {slots
                .slice(0)
                .reverse()
                .map((key) => (
                    <Widget key={key} widgetKey={key} scene={scene} view={view} />
                ))}
        </Box>
    );
}
