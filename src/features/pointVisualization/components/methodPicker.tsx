import { Tab, Tabs } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";

import { useAppDispatch } from "app/redux-store-interactions";
import { TabWithTooltip } from "components/tabWithTooltip";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { renderActions } from "features/render";

export function MethodPicker() {
    const {
        state: { view },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const location = useLocation();
    const history = useHistory();
    const dispatch = useAppDispatch();

    const hasClassification = view.renderState.scene?.config.hasPointClassification ?? false;
    const hasIntensity = view.renderState.scene?.config.hasPointIntensity ?? false;

    return (
        <Tabs
            value={location.pathname}
            onChange={(_, path) => {
                history.push(path);
                dispatch(renderActions.setPoints({ defaultPointVisualization: { kind: path.slice(1) } }));
            }}
        >
            <TabWithTooltip
                value="/classification"
                tooltipProps={{ title: hasClassification ? "" : t("projectDoesNotHaveClassificationData") }}
                label={t("classification")}
                disabled={!hasClassification}
            />
            <Tab value="/elevation" label={t("elevation")} />
            <TabWithTooltip
                value="/intensity"
                tooltipProps={{ title: hasIntensity ? "" : t("projectDoesNotHaveIntensityData") }}
                label={t("intensity")}
                disabled={!hasIntensity}
            />
            <Tab value="/color" label={t("rgb")} />
        </Tabs>
    );
}
