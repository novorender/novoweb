import { Tab, Tabs } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";

import { useAppDispatch } from "app/redux-store-interactions";
import { Tooltip } from "components";
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
            <Tooltip title={hasClassification ? "" : t("projectDoesNotHaveClassificationData")}>
                <div>
                    <Tab value="/classification" label={t("classification")} disabled={!hasClassification} />
                </div>
            </Tooltip>
            <Tab value="/elevation" label={t("elevation")} />
            <Tooltip title={hasClassification ? "" : t("projectDoesNotHaveIntensityData")}>
                <div>
                    <Tab value="/intensity" label={t("intensity")} disabled={!hasIntensity} />
                </div>
            </Tooltip>
            <Tab value="/color" label={t("rgb")} />
        </Tabs>
    );
}
