import { Box } from "@mui/material";

import { useAppSelector } from "app/redux-store-interactions";
import { featuresConfig, WidgetKey } from "config/features";
import { selectMaximized, selectMinimized } from "slices/explorer";

import { LinearProgress } from "./linearProgress";
import { LogoSpeedDial } from "./logoSpeedDial";
import { WidgetContainer } from "./widgetContainer";
import { WidgetHeader } from "./widgetHeader";

export function WidgetSkeleton({ widgetKey }: { widgetKey: WidgetKey }) {
    const config = featuresConfig[widgetKey];
    const minimized = useAppSelector(selectMinimized) === config.key;
    const maximized = useAppSelector(selectMaximized).includes(config.key);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader menuOpen={true} widget={config} />
                <Box position="relative">
                    <LinearProgress />
                </Box>
            </WidgetContainer>
            <LogoSpeedDial open={false} toggle={() => {}} />
        </>
    );
}
