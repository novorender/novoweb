import { MenuList } from "@mui/material";

import { WidgetMenuItem } from "./widgetMenuItem";

export function MeasureMenu({ onSelect }: { onSelect?: () => void }) {
    return (
        <MenuList>
            <WidgetMenuItem feature="area" onSelect={onSelect} />
            <WidgetMenuItem feature="outlineLaser" onSelect={onSelect} />
            <WidgetMenuItem feature="manhole" onSelect={onSelect} />
            <WidgetMenuItem feature="pointLine" onSelect={onSelect} />
        </MenuList>
    );
}
