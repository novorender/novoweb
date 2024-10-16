import { t } from "i18next";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig, WidgetKey } from "config/features";
import {
    explorerActions,
    selectCanAddWidget,
    selectMaximized,
    selectMaximizedHorizontal,
    selectWidgetLayout,
    selectWidgets,
    selectWidgetSlot,
} from "slices/explorer";
import { getTakenWidgetSlotCount } from "slices/explorer/utils";
import { mixpanel } from "utils/mixpanel";

export function useOpenWidget() {
    const canAddWidget = useAppSelector(selectCanAddWidget);
    const widgetSlot = useAppSelector(selectWidgetSlot);
    const widgetLayout = useAppSelector(selectWidgetLayout);
    const widgets = useAppSelector(selectWidgets);
    const dispatch = useAppDispatch();
    const maximized = useAppSelector(selectMaximized);
    const maximizedHorizontal = useAppSelector(selectMaximizedHorizontal);

    return useCallback(
        (widgetKey: WidgetKey, params: { replace?: WidgetKey } | { force?: boolean } = {}) => {
            // Some items that appear in widget list are not really widgets and have different opening logic
            if (widgetKey === featuresConfig.globalSearch.key) {
                trackOpened(widgetKey);
                dispatch(explorerActions.setGlobalSearchOpen(true));
                return;
            }

            if (widgets.includes(widgetKey)) {
                return;
            }

            const replace = "replace" in params ? params.replace : false;
            const force = "force" in params ? params.force : false;

            if (replace && widgets.includes(replace)) {
                trackClosed(replace);
                trackOpened(widgetKey);
                dispatch(explorerActions.replaceWidgetSlot({ replace: replace, key: widgetKey }));
            } else if (force) {
                if (getTakenWidgetSlotCount(widgets, maximized, maximizedHorizontal) >= widgetLayout.widgets) {
                    const evicted = widgets[widgets.length - 1];
                    trackClosed(evicted);
                }
                trackOpened(widgetKey);
                dispatch(explorerActions.forceOpenWidget(widgetKey));
            } else if (canAddWidget) {
                trackOpened(widgetKey);
                dispatch(explorerActions.addWidgetSlot(widgetKey));
                if (widgetSlot.open) {
                    dispatch(explorerActions.setWidgetSlot({ open: false, group: undefined }));
                }
            } else {
                let msg: string;
                if (widgetLayout.widgets > 1 && widgets.length === 1) {
                    msg = t("closeOrResizeTheWidgetToAddANewOne");
                } else if (widgetLayout.widgets === 1) {
                    msg = t("closeTheWidgetToAddANewOne");
                } else if (widgetLayout.widgets !== widgets.length) {
                    msg = t("closeOrResizeOneOfTheWidgetsToAddANewOne");
                } else {
                    msg = t("closeOneOfTheWidgetsToAddANewOne");
                }
                dispatch(explorerActions.setSnackbarMessage({ msg, closeAfter: 5000 }));
            }
        },
        [canAddWidget, widgetSlot, widgetLayout, widgets, dispatch, maximized, maximizedHorizontal],
    );
}

function trackOpened(key: WidgetKey) {
    mixpanel?.track("Opened Widget", { "Widget Key": key });
}

function trackClosed(key: WidgetKey) {
    mixpanel?.track("Closed Widget", { "Widget Key": key });
}
