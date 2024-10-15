import { useEffect, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { FeatureGroupKey, featuresConfig, type WidgetKey } from "config/features";
import { useOpenWidget } from "hooks/useOpenWidget";
import { selectWidgets } from "slices/explorer";

import { Root } from "./routes/root";

export default function GroupedWidgetList({
    widgetKey,
    featureGroupKey,
    onSelect,
}: {
    widgetKey?: WidgetKey;
    featureGroupKey?: FeatureGroupKey;
    onSelect: () => void;
}) {
    const activeWidgets = useAppSelector(selectWidgets);
    const config = widgetKey ? featuresConfig[widgetKey] : undefined;
    const [expandedGroupKey, setExpandedGroupKey] = useState(
        featureGroupKey || (config && "groups" in config && config.groups[0]) || null,
    );
    const openWidget = useOpenWidget();

    useEffect(() => {
        if (featureGroupKey) {
            setExpandedGroupKey(featureGroupKey);
        }
    }, [featureGroupKey]);

    const handleClick = (key: WidgetKey) => () => {
        const active = key !== widgetKey && activeWidgets.includes(key);

        if (active) {
            return;
        }

        if (!widgetKey) {
            onSelect();
            openWidget(key);
            return;
        }

        onSelect();
        openWidget(key, { replace: widgetKey });
    };

    return (
        <Root
            currentWidget={widgetKey}
            handleClick={handleClick}
            expandedGroupKey={expandedGroupKey}
            setExpandedGroupKey={setExpandedGroupKey}
        />
    );
}
