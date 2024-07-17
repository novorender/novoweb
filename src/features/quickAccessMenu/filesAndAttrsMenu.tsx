import { MenuList } from "@mui/material";

import { WidgetMenuItem } from "./widgetMenuItem";

export function FilesAndAttrsMenu({ onSelect }: { onSelect?: () => void }) {
    return (
        <MenuList>
            <WidgetMenuItem feature="modelTree" onSelect={onSelect} />
            <WidgetMenuItem feature="properties" onSelect={onSelect} />
            <WidgetMenuItem feature="propertyTree" onSelect={onSelect} />
        </MenuList>
    );
}
