import { storageConfig, StorageKey } from "config/storage";

export function getFromStorage(key: StorageKey): string {
    return storageConfig[key].storage.getItem(key) ?? "";
}

export function saveToStorage(key: StorageKey, value: string): void {
    storageConfig[key].storage.setItem(key, value);
}

export function deleteFromStorage(key: StorageKey): void {
    storageConfig[key].storage.remove(key);
}
