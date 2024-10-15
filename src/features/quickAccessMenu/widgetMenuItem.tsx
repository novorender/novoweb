import { ListItemIcon, ListItemText, MenuItem } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "app/redux-store-interactions";
import { featuresConfig, WidgetKey } from "config/features";
import { useOpenWidget } from "hooks/useOpenWidget";
import { selectWidgets } from "slices/explorer";

export function WidgetMenuItem({ feature, onSelect }: { feature: WidgetKey; onSelect?: () => void }) {
    const { t } = useTranslation();
    const isActive = useAppSelector((state) => selectWidgets(state).includes(feature));
    const openWidget = useOpenWidget();

    const config = featuresConfig[feature];
    const Icon = config.Icon;

    const handleClick = () => {
        onSelect?.();
        openWidget(feature);
    };

    return (
        <MenuItem onClick={handleClick} disabled={isActive}>
            <ListItemIcon>
                <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{t(config.nameKey)}</ListItemText>
        </MenuItem>
    );
}
