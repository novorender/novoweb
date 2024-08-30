import { ListItemIcon, ListItemText, MenuItem, useTheme } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { featuresConfig, WidgetKey } from "config/features";
import { explorerActions, selectCanAddWidget, selectWidgets } from "slices/explorer";

export function WidgetMenuItem({ feature, onSelect }: { feature: WidgetKey; onSelect?: () => void }) {
    const theme = useTheme();
    const { t } = useTranslation();
    const isActive = useAppSelector((state) => selectWidgets(state).includes(feature));
    const dispatch = useAppDispatch();
    const canAddWidget = useAppSelector(selectCanAddWidget);

    const config = featuresConfig[feature];
    const Icon = config.Icon;

    const handleClick = () => {
        if (isActive) {
            dispatch(explorerActions.removeWidgetSlot(feature));
        } else if (canAddWidget) {
            dispatch(explorerActions.addWidgetSlot(feature));
        }
        onSelect?.();
    };

    return (
        <MenuItem onClick={handleClick}>
            <ListItemIcon>
                <Icon fontSize="small" sx={{ color: isActive ? theme.palette.primary.main : undefined }} />
            </ListItemIcon>
            <ListItemText>{t(config.nameKey)}</ListItemText>
        </MenuItem>
    );
}
