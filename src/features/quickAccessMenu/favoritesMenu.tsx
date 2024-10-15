import { StarOutline } from "@mui/icons-material";
import { Box, MenuList } from "@mui/material";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "app/redux-store-interactions";
import { selectEnabledWidgets, selectFavoriteWidgets } from "slices/explorer";

import { WidgetMenuItem } from "./widgetMenuItem";

export function FavoritesMenu({ onSelect }: { onSelect?: () => void }) {
    const enabledWidgets = useAppSelector(selectEnabledWidgets);
    const favoriteWidgets = useAppSelector(selectFavoriteWidgets);
    const { t } = useTranslation();

    const filteredWidgets = useMemo(
        () => favoriteWidgets.filter((key) => enabledWidgets.some((w) => w.key === key)),
        [favoriteWidgets, enabledWidgets],
    );

    if (filteredWidgets.length === 0) {
        return (
            <Box textAlign="center" m={2} color="grey" sx={{ maxWidth: "240px", verticalAlign: "text-bottom" }}>
                {t("noFavoriteWidgets1") + " "}
                <StarOutline sx={{ verticalAlign: "text-bottom" }} /> {" " + t("noFavoriteWidgets2")}
            </Box>
        );
    }

    return (
        <MenuList>
            {filteredWidgets.map((widget) => (
                <WidgetMenuItem key={widget} feature={widget} onSelect={onSelect} />
            ))}
        </MenuList>
    );
}
