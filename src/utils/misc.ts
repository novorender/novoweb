import { WidgetKey, featuresConfig, defaultEnabledWidgets } from "config/features";

export function uniqueArray<T>(arr: T[]): T[] {
    return arr.filter((val, idx, self) => {
        return self.indexOf(val) === idx;
    });
}

export function replaceEncodedSlash(str: String) {
    return str.replace(/%2f/g, "/");
}

export function enabledFeaturesToFeatureKeys(enabledFeatures: Record<string, boolean>): WidgetKey[] {
    const dictionary: Record<string, string | string[] | undefined> = {
        bookmarks: featuresConfig.bookmarks.key,
        measurement: featuresConfig.measure.key,
        clipping: [featuresConfig.clippingBox.key, featuresConfig.clippingPlanes.key],
        properties: featuresConfig.properties.key,
        tree: featuresConfig.modelTree.key,
        groups: featuresConfig.groups.key,
        search: featuresConfig.search.key,
    };

    return uniqueArray(
        Object.keys(enabledFeatures)
            .map((key) => ({ key, enabled: enabledFeatures[key] }))
            .filter((feature) => feature.enabled)
            .map((feature) => (dictionary[feature.key] ? dictionary[feature.key]! : feature.key))
            .concat(defaultEnabledWidgets)
            .flat() as WidgetKey[]
    );
}

export function getEnabledFeatures(customProperties: unknown): Record<string, boolean> | undefined {
    return customProperties && typeof customProperties === "object" && "enabledFeatures" in customProperties
        ? (customProperties as { enabledFeatures?: Record<string, boolean> }).enabledFeatures
        : undefined;
}
