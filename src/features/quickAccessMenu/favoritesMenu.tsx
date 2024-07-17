import { Box, MenuList } from "@mui/material";

import { useAppSelector } from "app/redux-store-interactions";
import { selectFavoriteWidgets } from "slices/explorer";

import { WidgetMenuItem } from "./widgetMenuItem";

export function FavoritesMenu({ onSelect }: { onSelect?: () => void }) {
    const favoriteWidgets = useAppSelector(selectFavoriteWidgets);

    if (favoriteWidgets.length === 0) {
        return (
            <Box textAlign="center" m={2} color="grey">
                No favorite widgets
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
