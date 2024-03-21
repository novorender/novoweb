import { AuthenticationHeader } from "@novorender/data-js-api";

import { StorageKey } from "config/storage";
import { getFromStorage } from "utils/storage";

export async function getAuthHeader(): Promise<AuthenticationHeader> {
    const accessToken = getFromStorage(StorageKey.AccessToken);

    if (!accessToken) {
        return { header: "", value: "" };
    }

    return { header: "Authorization", value: `Bearer ${accessToken}` };
}
