import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig, WidgetKey } from "config/features";
import { explorerActions, selectWidgets } from "slices/explorer";
import { mixpanel } from "utils/mixpanel";

export function useRemoveWidget() {
    const widgets = useAppSelector(selectWidgets);
    const dispatch = useAppDispatch();

    return useCallback(
        (widgetKey: WidgetKey, { reason }: { reason?: "offline" | "used" | "discarded" } = {}) => {
            if (widgetKey === featuresConfig.globalSearch.key) {
                trackClosed(widgetKey, reason);
                dispatch(explorerActions.setGlobalSearchOpen(false));
                return;
            }

            if (!widgets.includes(widgetKey)) {
                return;
            }

            trackClosed(widgetKey, reason);
            dispatch(explorerActions.removeWidgetSlot(widgetKey));
        },
        [widgets, dispatch],
    );
}

function trackClosed(key: WidgetKey, reason?: string) {
    mixpanel?.track("Closed Widget", { "Widget Key": key, "Close Reason": reason });
}
