export function uniqueArray<T>(arr: T[]): T[] {
    return arr.filter((val, idx, self) => {
        return self.indexOf(val) === idx;
    });
}

export function replaceEncodedSlash(str: String) {
    return str.replace(/%2f/g, "/");
}
