import { useAppSelector } from "app/store";
import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig, WidgetKey } from "config/features";
import WidgetList from "features/widgetList/widgetList";
import { useToggle } from "hooks/useToggle";
import { selectMaximized, selectMinimized } from "slices/explorer";

import { ScrollBox } from "./scrollBox";

export function WidgetError({ widgetKey }: { widgetKey: WidgetKey }) {
    const config = featuresConfig[widgetKey];
    const minimized = useAppSelector(selectMinimized) === config.key;
    const maximized = useAppSelector(selectMaximized).includes(config.key);
    const [menuOpen, toggleMenu] = useToggle();

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={config} disableShadow={menuOpen} />
                <ScrollBox display={menuOpen || minimized ? "none" : "block"}>
                    An error occurred while loading {config.name}
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={config.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} />
        </>
    );
}
