import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "app/redux-store-interactions";
import { featuresConfig } from "config/features";
import { selectEnabledWidgets } from "slices/explorer";

import { Category } from "../types";

export function useWidgetOptions(skip: boolean) {
    const widgets = useAppSelector(selectEnabledWidgets);
    const { t } = useTranslation();

    return useMemo(() => {
        if (skip) {
            return [];
        }

        return widgets
            .filter((w) => w.key !== featuresConfig.globalSearch.key)
            .map((w) => ({
                id: `widget-${w.key}`,
                label: t(w.nameKey),
                widget: w,
                category: Category.Widget as const,
            }));
    }, [t, widgets, skip]);
}
