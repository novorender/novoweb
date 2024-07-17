import { ReactNode, useEffect } from "react";
import { MemoryRouter, Route, Switch, useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { FeatureGroupKey, featuresConfig, type WidgetKey } from "config/features";
import { explorerActions, selectWidgets } from "slices/explorer";

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
    const group = featureGroupKey ?? (config && "groups" in config && config.groups[0]);

    return (
        <MemoryRouter
            initialEntries={group ? ["/", { pathname: "/", state: { group } }] : undefined}
            initialIndex={group ? 1 : 0}
        >
            <CustomSwitch featureGroupKey={featureGroupKey}>
                <Route path="/" exact>
                    <Root currentWidget={widgetKey} handleClick={handleClick} />
                </Route>
            </CustomSwitch>
        </MemoryRouter>
    );
}

function CustomSwitch({ featureGroupKey, children }: { featureGroupKey?: FeatureGroupKey; children: ReactNode }) {
    const history = useHistory();

    useEffect(() => {
        if (featureGroupKey) {
            history.push({ pathname: "/", state: { group: featureGroupKey } });
        }
    }, [history, featureGroupKey]);

    return <Switch>{children}</Switch>;
}
