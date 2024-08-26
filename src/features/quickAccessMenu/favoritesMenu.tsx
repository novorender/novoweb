import { StarOutline } from "@mui/icons-material";
import { Box, MenuList } from "@mui/material";
import { useTranslation } from "react-i18next";

import { useAppSelector } from "app/redux-store-interactions";
import { selectFavoriteWidgets } from "slices/explorer";

import { WidgetMenuItem } from "./widgetMenuItem";

export function FavoritesMenu({ onSelect }: { onSelect?: () => void }) {
    const favoriteWidgets = useAppSelector(selectFavoriteWidgets);
    const { t } = useTranslation();

    if (favoriteWidgets.length === 0) {
        return (
            <Box textAlign="center" m={2} color="grey" sx={{ maxWidth: "240px", verticalAlign: "text-bottom" }}>
                {t("noFavoriteWidgets1") + " "}
                <StarOutline sx={{ verticalAlign: "text-bottom" }} /> {" " + t("noFavoriteWidgets2")}
            </Box>
        );
    }

    return (
        <MenuList>
            {favoriteWidgets.map((widget) => (
                <WidgetMenuItem key={widget} feature={widget} onSelect={onSelect} />
            ))}
        </MenuList>
    );
}
