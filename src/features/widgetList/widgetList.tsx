import { MemoryRouter, Route, Switch } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { explorerActions, selectWidgets } from "slices/explorerSlice";
import { WidgetKey, featuresConfig } from "config/features";

import { Root } from "./routes/root";
import { Tag } from "./routes/tag";

type Props = { widgetKey?: WidgetKey; onSelect: () => void };

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
    featuresConfig.clippingBox.key,
    featuresConfig.orthoCam.key,
    featuresConfig.panoramas.key,
    featuresConfig.propertyTree.key,
    featuresConfig.manhole.key,
    featuresConfig.area.key,
    featuresConfig.pointLine.key,
    featuresConfig.deviations.key,
    featuresConfig.followPath.key,
    featuresConfig.advancedSettings.key,
] as WidgetKey[];

export default function WidgetList({ widgetKey, onSelect }: Props) {
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

    return (
        <MemoryRouter>
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
