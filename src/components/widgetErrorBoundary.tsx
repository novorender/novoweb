import { Component } from "react";

import { LogoSpeedDial, WidgetContainer, WidgetHeader } from "components";
import { featuresConfig, WidgetKey } from "config/features";
import { useAppSelector } from "app/store";
import { selectMaximized, selectMinimized } from "slices/explorerSlice";
import { useToggle } from "hooks/useToggle";
import WidgetList from "features/widgetList/widgetList";

import { ScrollBox } from "./scrollBox";

export class WidgetErrorBoundary extends Component<{ widgetKey: WidgetKey; children: any }, { hasError: boolean }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: any, errorInfo: any) {
        console.warn(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <WidgetError widgetKey={this.props.widgetKey} />;
        }

        return this.props.children;
    }
}

function WidgetError({ widgetKey }: { widgetKey: WidgetKey }) {
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
