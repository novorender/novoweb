import { Box, useMediaQuery, useTheme } from "@material-ui/core";
import type { Scene, View } from "@novorender/webgl-api";

import { selectWidgets } from "slices/appSlice";
import { useAppSelector } from "app/store";
import { MenuWidget, Widget } from "features/widget";

type Props = { scene: Scene; view: View };

export function Widgets({ scene, view }: Props) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
    const slots = useAppSelector(selectWidgets);

    return (
        <Box display="flex" flexDirection="column" alignItems="flex-end">
            {(isSmall && slots.length < 1) || (!isSmall && slots.length < 2) ? <MenuWidget /> : null}
            {slots
                .slice(0, isSmall ? 1 : 2)
                .reverse()
                .map((key) => (
                    <Widget key={key} widgetKey={key} scene={scene} view={view} />
                ))}
        </Box>
    );
}
