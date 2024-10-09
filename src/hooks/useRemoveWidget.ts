import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { WidgetKey } from "config/features";
import { explorerActions, selectWidgets } from "slices/explorer";
import { mixpanel } from "utils/mixpanel";

export function useRemoveWidget() {
    const widgets = useAppSelector(selectWidgets);
    const dispatch = useAppDispatch();

    return useCallback(
        (widgetKey: WidgetKey, { reason }: { reason?: "offline" } = {}) => {
            if (!widgets.includes(widgetKey)) {
                // not open, noop
            } else {
                mixpanel?.track("Closed Widget", { "Widget Key": widgetKey, "Close Reason": reason });
                dispatch(explorerActions.removeWidgetSlot(widgetKey));
            }
        },
        [widgets, dispatch],
    );
}
