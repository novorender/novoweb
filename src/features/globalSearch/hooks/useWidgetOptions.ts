import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "app/redux-store-interactions";
import { selectEnabledWidgets } from "slices/explorer";

import { Category } from "../types";

export function useWidgetOptions() {
    const widgets = useAppSelector(selectEnabledWidgets);
    const { t } = useTranslation();

    return useMemo(() => {
        return widgets.map((w) => ({
            id: `widget-${w.key}`,
            label: t(w.nameKey),
            widget: w,
            category: Category.Widget as const,
        }));
    }, [t, widgets]);
}
