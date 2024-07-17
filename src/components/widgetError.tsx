import { useAppSelector } from "app/redux-store-interactions";
import { featuresConfig, WidgetKey } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";

import { LogoSpeedDial } from "./logoSpeedDial";
import { ScrollBox } from "./scrollBox";
import { WidgetContainer } from "./widgetContainer";
import { WidgetHeader } from "./widgetHeader";

export function WidgetError({ widgetKey }: { widgetKey: WidgetKey }) {
    const config = featuresConfig[widgetKey];
    const minimized = useAppSelector(selectMinimized) === config.key;
    const maximized = useAppSelector(selectMaximized).includes(config.key);
    const [menuOpen, toggleMenu] = useToggle();

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader menuOpen={menuOpen} toggleMenu={toggleMenu} widget={config} disableShadow={menuOpen} />
                <ScrollBox display={menuOpen || minimized ? "none" : "block"}>
                    An error occurred while loading {config.name}
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={config.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
