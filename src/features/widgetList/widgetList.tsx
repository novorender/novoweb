import { MemoryRouter, Route, Switch } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { featuresConfig, WidgetKey } from "config/features";
import { explorerActions, selectWidgets } from "slices/explorerSlice";

import { Root } from "./routes/root";
import { Tag } from "./routes/tag";

export const sorting = [
    featuresConfig.properties.key,
    featuresConfig.modelTree.key,
    featuresConfig.bookmarks.key,
    featuresConfig.selectionBasket.key,
    featuresConfig.groups.key,
    featuresConfig.search.key,
    featuresConfig.measure.key,
    featuresConfig.shareLink.key,
    featuresConfig.clippingPlanes.key,
    featuresConfig.orthoCam.key,
    featuresConfig.images.key,
    featuresConfig.propertyTree.key,
    featuresConfig.manhole.key,
    featuresConfig.area.key,
    featuresConfig.pointLine.key,
    featuresConfig.deviations.key,
    featuresConfig.followPath.key,
    featuresConfig.advancedSettings.key,
] as WidgetKey[];

export default function WidgetList({ widgetKey, onSelect }: { widgetKey?: WidgetKey; onSelect: () => void }) {
    const activeWidgets = useAppSelector(selectWidgets);
    const dispatch = useAppDispatch();

    const handleClick = (key: WidgetKey) => () => {
        const active = key !== widgetKey && activeWidgets.includes(key);

        if (active) {
            return;
        }

        if (!widgetKey) {
            onSelect();
            return dispatch(explorerActions.addWidgetSlot(key));
        }

        onSelect();
        dispatch(explorerActions.replaceWidgetSlot({ replace: widgetKey, key }));
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
