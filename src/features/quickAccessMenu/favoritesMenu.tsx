import { StarOutline } from "@mui/icons-material";
import { Box, MenuList } from "@mui/material";

import { useAppSelector } from "app/redux-store-interactions";
import { selectFavoriteWidgets } from "slices/explorer";

import { WidgetMenuItem } from "./widgetMenuItem";

export function FavoritesMenu({ onSelect }: { onSelect?: () => void }) {
    const favoriteWidgets = useAppSelector(selectFavoriteWidgets);

    if (favoriteWidgets.length === 0) {
        return (
            <Box textAlign="center" m={2} color="grey" sx={{ maxWidth: "240px", verticalAlign: "text-bottom" }}>
                No favorite widgets selected. Choose your favorites by clicking the{" "}
                <StarOutline sx={{ verticalAlign: "text-bottom" }} /> icon in the top right corner of a widget.
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
