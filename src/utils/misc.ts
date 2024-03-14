import { MeasureEntity, MeasurementValues, PointEntity, View } from "@novorender/api";

import { RecursivePartial } from "types/misc";

export function uniqueArray<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}

export function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest("SHA-256", data);
}

export function generateRandomString(): string {
    return Array.from(window.crypto.getRandomValues(new Uint32Array(28)))
        .map((num) => ("0" + num.toString(16)).slice(-2))
        .join("");
}

export function base64UrlEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    let str = "";
    for (let i = 0; i < len; i++) {
        str += String.fromCharCode(bytes[i]);
    }
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlEncodeImg(arrayBuffer: ArrayBuffer): string {
    const encodings = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const bytes = new Uint8Array(arrayBuffer);
    const byteLength = bytes.byteLength;
    const byteRemainder = byteLength % 3;
    const mainLength = byteLength - byteRemainder;

    let base64 = "";
    let a, b, c, d;
    let chunk;

    // Main loop deals with bytes in chunks of 3
    for (let i = 0; i < mainLength; i = i + 3) {
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
    let { width, height } = canvas;

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
    const ctx = dist.getContext("2d");

    try {
        {
            const bitmap = await createImageBitmap(canvas, {
                resizeHeight: height,
                resizeWidth: width,
                resizeQuality: "high",
            });

            ctx?.drawImage(bitmap, 0, 0);
        }

        await Promise.all(
            Array.from(document.querySelectorAll("[data-include-snapshot]")).map(async (el) => {
                if (!(el instanceof HTMLCanvasElement)) {
                    return;
                }

                const bitmap = await createImageBitmap(el, {
                    resizeHeight: height,
                    resizeWidth: width,
                    resizeQuality: "high",
                });
                ctx?.drawImage(bitmap, 0, 0);
            })
        );

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

export function getAssetUrl(view: View, path: string): URL {
    const baseUrl = view.renderState.scene?.url ?? "";
    if (!baseUrl) {
        throw new Error("No base URL in view.");
    }
    const url = new URL(baseUrl.replace("webgl2_bin/", ""));
    url.pathname += path;

    return url;
}

export function isRealNumber(num: number): boolean {
    return !Number.isNaN(num) && Number.isFinite(num);
}

export function isRealVec(vec: number[]): boolean {
    return !vec.some((num) => !isRealNumber(num));
}

export function mergeRecursive<T>(original: T, changes: RecursivePartial<T>): T {
    const clone = { ...original };
    for (const key in changes) {
        const originalValue = original ? original[key] : undefined;
        const changedValue = changes[key];
        if (
            // eslint-disable-next-line eqeqeq
            changedValue != undefined &&
            typeof changedValue == "object" &&
            !Array.isArray(changedValue) &&
            !ArrayBuffer.isView(changedValue) &&
            !(changedValue instanceof Set)
        ) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            clone[key] = mergeRecursive(originalValue as any, changedValue);
        } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            clone[key] = changedValue as any;
        }
    }
    return clone;
}

/**
 * Format file size in metric prefix, i.e. where K = 1000;
 * @param fileSize The byte size to format. Undefined numbers are reported as "<unknown>".
 * @returns The size formated in "bytes", "KB", "MB" etc.
 */
export function formatFileSizeMetric(fileSize: number | undefined) {
    if (fileSize === undefined) {
        return "<unknown>";
    }

    let size = Math.abs(fileSize);

    if (Number.isNaN(size)) {
        return "Invalid file size";
    }

    if (size === 0) {
        return "0 bytes";
    }

    const units = ["bytes", "KB", "MB", "GB", "TB"];
    let quotient = Math.floor(Math.log10(size) / 3);
    quotient = quotient < units.length ? quotient : units.length - 1;
    size /= 1000 ** quotient;

    return `${+size.toFixed(2)} ${units[quotient]}`;
}
