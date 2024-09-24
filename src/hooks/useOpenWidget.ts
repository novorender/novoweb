import { t } from "i18next";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { WidgetKey } from "config/features";
import {
    explorerActions,
    selectCanAddWidget,
    selectWidgetLayout,
    selectWidgets,
    selectWidgetSlot,
} from "slices/explorer";

export function useOpenWidget() {
    const canAddWidget = useAppSelector(selectCanAddWidget);
    const widgetSlot = useAppSelector(selectWidgetSlot);
    const widgetLayout = useAppSelector(selectWidgetLayout);
    const widgets = useAppSelector(selectWidgets);
    const dispatch = useAppDispatch();

    return useCallback(
        (widgetKey: WidgetKey) => {
            if (widgets.includes(widgetKey)) {
                return;
            }

            if (canAddWidget) {
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
        [canAddWidget, widgetSlot, widgetLayout, widgets, dispatch],
    );
}
