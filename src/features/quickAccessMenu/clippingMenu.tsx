import { MenuList } from "@mui/material";

import { WidgetMenuItem } from "./widgetMenuItem";

export function ClippingMenu({ onSelect }: { onSelect?: () => void }) {
    return (
        <MenuList>
            <WidgetMenuItem feature="clippingPlanes" onSelect={onSelect} />
        </MenuList>
    );
}
