import { Box } from "@mui/material";

import { useAppSelector } from "app/store";
import { LinearProgress, LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { WidgetKey, featuresConfig } from "config/features";
import { selectMaximized, selectMinimized } from "slices/explorerSlice";

export function WidgetSkeleton({ widgetKey }: { widgetKey: WidgetKey }) {
    const config = featuresConfig[widgetKey];
    const minimized = useAppSelector(selectMinimized) === config.key;
    const maximized = useAppSelector(selectMaximized).includes(config.key);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={config} />
                <Box position="relative">
                    <LinearProgress />
                </Box>
            </WidgetContainer>
            <LogoSpeedDial open={false} toggle={() => {}} />
        </>
    );
}
