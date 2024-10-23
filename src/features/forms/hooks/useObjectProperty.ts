import { ObjectData } from "@novorender/webgl-api";
import { useEffect, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectSelectedFormObjectGuid } from "features/forms/slice";
import { searchByPatterns } from "utils/search";

export function useObjectProperty(property?: { name: string; value?: string }) {
    const {
        state: { db },
    } = useExplorerGlobals(false);
    const selectedFormObjectGuid = useAppSelector(selectSelectedFormObjectGuid);

    const [value, setValue] = useState<string | number | null>(null);

    useEffect(() => {
        async function fetchPropertyValue() {
            if (!selectedFormObjectGuid || !db || !property?.name) {
                setValue(null);
                return;
            }

            await searchByPatterns<ObjectData>({
                db,
                searchPatterns: [{ property: "GUID", value: selectedFormObjectGuid, exact: true }],
                full: false,
                callback: (objects) => {
                    const propValue =
                        objects?.[0]?.[property.name.toLocaleLowerCase() as keyof ObjectData] ??
                        objects?.[0]?.properties.find(([propName]) => propName === property?.name)?.[1];
                    if (propValue && (typeof propValue === "string" || Number.isInteger(propValue))) {
                        setValue(propValue as string | number);
                    }
                },
            });
        }

        fetchPropertyValue();
    }, [selectedFormObjectGuid, db, property?.name]);

    if (property?.name && value !== null) {
        return { name: property.name, value };
    }
}
