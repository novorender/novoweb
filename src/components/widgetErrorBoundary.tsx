import { Component, ErrorInfo, PropsWithChildren } from "react";

import { WidgetKey } from "config/features";

import { WidgetError } from "./widgetError";

export class WidgetErrorBoundary extends Component<PropsWithChildren<{ widgetKey: WidgetKey }>, { hasError: boolean }> {
    constructor(props: { widgetKey: WidgetKey }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.warn(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return <WidgetError widgetKey={this.props.widgetKey} />;
        }

        return this.props.children;
    }
}
