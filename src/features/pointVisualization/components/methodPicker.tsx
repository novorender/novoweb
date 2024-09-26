import { Tab, Tabs } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";

import { useAppDispatch } from "app/redux-store-interactions";
import { renderActions } from "features/render";

export function MethodPicker() {
    const { t } = useTranslation();
    const location = useLocation();
    const history = useHistory();
    const dispatch = useAppDispatch();

    return (
        <Tabs
            value={location.pathname}
            onChange={(_, path) => {
                history.push(path);
                dispatch(renderActions.setPoints({ defaultPointVisualization: { kind: path.slice(1) } }));
            }}
        >
            <Tab value="/classification" label={t("classification")} />
            <Tab value="/elevation" label={t("elevation")} />
            <Tab value="/intensity" label={t("intensity")} />
            <Tab value="/color" label={t("rgb")} />
        </Tabs>
    );
}
