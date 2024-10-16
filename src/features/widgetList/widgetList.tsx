import { MemoryRouter, Route, Switch } from "react-router-dom";

import { useAppSelector } from "app/redux-store-interactions";
import { FeatureGroupKey, featuresConfig, type WidgetKey } from "config/features";
import GroupedWidgetList from "features/groupedWidgetList/groupedWidgetList";
import { useOpenWidget } from "hooks/useOpenWidget";
import { selectNewDesign, selectWidgets } from "slices/explorer";

import { Root } from "./routes/root";
import { Tag } from "./routes/tag";

export default function WidgetList(props: {
    widgetKey?: WidgetKey;
    featureGroupKey?: FeatureGroupKey;
    onSelect: () => void;
}) {
    const newDesign = useAppSelector(selectNewDesign);
    if (newDesign) {
        return <GroupedWidgetList {...props} />;
    } else {
        return <WidgetListInner {...props} />;
    }
}

function WidgetListInner({ widgetKey, onSelect }: { widgetKey?: WidgetKey; onSelect: () => void }) {
    const activeWidgets = useAppSelector(selectWidgets);
    const openWidget = useOpenWidget();

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

    const config = widgetKey ? featuresConfig[widgetKey] : undefined;
    const tag = config && "tags" in config ? config.tags[0] : undefined;

    return (
        <MemoryRouter initialEntries={tag ? ["/", `/tag/${tag}`] : undefined} initialIndex={tag ? 1 : 0}>
            <Switch>
                <Route path="/" exact>
                    <Root currentWidget={widgetKey} handleClick={handleClick} />
                </Route>
                <Route path="/tag/:tag">
                    <Tag currentWidget={widgetKey} handleClick={handleClick} />
                </Route>
            </Switch>
        </MemoryRouter>
    );
}
