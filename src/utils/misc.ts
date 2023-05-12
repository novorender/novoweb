import { MeasureEntity, MeasurementValues, PointEntity } from "@novorender/measure-api";
import { Scene } from "@novorender/webgl-api";
import { WidgetKey, featuresConfig, defaultEnabledWidgets } from "config/features";

export function uniqueArray<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}

export function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest("SHA-256", data);
}

export function generateRandomString(): string {
    var array = new Uint32Array(56 / 2);
    window.crypto.getRandomValues(array);
    return Array.from(array, (num) => ("0" + num.toString(16)).substr(-2)).join("");
}

export function enabledFeaturesToFeatureKeys(enabledFeatures: Record<string, boolean>): WidgetKey[] {
    const dictionary: Record<string, string | string[] | undefined> = {
        bookmarks: featuresConfig.bookmarks.key,
        measurement: [featuresConfig.measure.key, featuresConfig.followPath.key],
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

export function base64UrlEncode(buffer: ArrayBuffer): string {
    var str = "";
    var bytes = new Uint8Array(buffer);
    var len = bytes.byteLength;
    for (var i = 0; i < len; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlEncodeImg(arrayBuffer: ArrayBuffer): string {
    var base64 = "";
    var encodings = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    var bytes = new Uint8Array(arrayBuffer);
    var byteLength = bytes.byteLength;
    var byteRemainder = byteLength % 3;
    var mainLength = byteLength - byteRemainder;

    var a, b, c, d;
    var chunk;

    // Main loop deals with bytes in chunks of 3
    for (var i = 0; i < mainLength; i = i + 3) {
        // Combine the three bytes into a single integer
        chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];

        // Use bitmasks to extract 6-bit segments from the triplet
        a = (chunk & 16515072) >> 18; // 16515072 = (2^6 - 1) << 18
        b = (chunk & 258048) >> 12; // 258048   = (2^6 - 1) << 12
        c = (chunk & 4032) >> 6; // 4032     = (2^6 - 1) << 6
        d = chunk & 63; // 63       = 2^6 - 1

        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d];
    }

    // Deal with the remaining bytes and padding
    if (byteRemainder === 1) {
        chunk = bytes[mainLength];

        a = (chunk & 252) >> 2; // 252 = (2^6 - 1) << 2

        // Set the 4 least significant bits to zero
        b = (chunk & 3) << 4; // 3   = 2^2 - 1

        base64 += encodings[a] + encodings[b] + "==";
    } else if (byteRemainder === 2) {
        chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];

        a = (chunk & 64512) >> 10; // 64512 = (2^6 - 1) << 10
        b = (chunk & 1008) >> 4; // 1008  = (2^6 - 1) << 4

        // Set the 2 least significant bits to zero
        c = (chunk & 15) << 2; // 15    = 2^4 - 1

        base64 += encodings[a] + encodings[b] + encodings[c] + "=";
    }

    return base64;
}

export function capitalize(str: string): string {
    return str[0].toUpperCase() + str.slice(1);
}

export async function createCanvasSnapshot(
    canvas: HTMLCanvasElement,
    maxWidth: number,
    maxHeight: number
): Promise<string | undefined> {
    let { width, height } = canvas.getBoundingClientRect();

    if (width > maxWidth) {
        height = height * (maxWidth / width);
        width = maxWidth;
    }

    if (height > maxHeight) {
        width = width * (maxHeight / height);
        height = maxHeight;
    }

    const dist = document.createElement("canvas");
    dist.height = height;
    dist.width = width;
    const ctx = dist.getContext("2d")!;

    try {
        {
            const bitmap = await createImageBitmap(canvas, {
                resizeHeight: height,
                resizeWidth: width,
                resizeQuality: "high",
            });

            ctx.drawImage(bitmap, 0, 0);
        }

        const canvas2D = document.getElementById("canvas2D") as HTMLCanvasElement | null;
        if (canvas2D) {
            const bitmap = await createImageBitmap(canvas2D, {
                resizeHeight: height,
                resizeWidth: width,
                resizeQuality: "high",
            });
            ctx.drawImage(bitmap, 0, 0);
        }

        return dist.toDataURL("image/png");
    } catch (e) {
        console.warn(e);
        return;
    }
}

export function measureObjectIsVertex(measureObject: MeasureEntity | undefined): measureObject is PointEntity {
    return measureObject ? measureObject.drawKind === "vertex" : false;
}

export function getMeasurementValueKind(val: MeasurementValues): string {
    return "kind" in val ? val.kind : "";
}

export function getAssetUrl(scene: Scene, path: string): URL {
    const url = new URL((scene as any).assetUrl);
    url.pathname += path;

    return url;
}

export function isRealNumber(num: number): boolean {
    return !Number.isNaN(num) && Number.isFinite(num);
}

export function isRealVec(vec: number[]): boolean {
    return !vec.some((num) => !isRealNumber(num));
}
