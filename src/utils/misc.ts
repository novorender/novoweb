export function uniqueArray<T>(arr: T[]): T[] {
    return arr.filter((val, idx, self) => {
        return self.indexOf(val) === idx;
    });
}

export function replaceEncodedSlash(str: String) {
    return str.replace(/%2f/g, "/");
}

export function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return window.crypto.subtle.digest("SHA-256", data);
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

export function generateRandomString(): string {
    var array = new Uint32Array(56 / 2);
    window.crypto.getRandomValues(array);
    return Array.from(array, (num) => ("0" + num.toString(16)).substr(-2)).join("");
}
