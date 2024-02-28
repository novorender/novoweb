import { List } from "@mui/material";
import { MutableRefObject } from "react";

import { LinearProgress } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { getAssetUrl } from "utils/misc";

import { useGetPropertiesQuery } from "./api";
import { InternalNode } from "./internalNode";

export function RootNode({ abortController }: { abortController: MutableRefObject<AbortController> }) {
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const { data, isLoading } = useGetPropertiesQuery({ assetUrl: getAssetUrl(view, "").toString(), path: "root" });

    if (isLoading) {
        return <LinearProgress />;
    }

    if (!data || !("properties" in data)) {
        return "An error occurred while loading properties.";
    }

    return (
        <List disablePadding>
            {data.properties.map((property) => (
                <InternalNode
                    key={property}
                    path={property}
                    propertyName={property}
                    level={1}
                    abortController={abortController}
                />
            ))}
        </List>
    );
}
