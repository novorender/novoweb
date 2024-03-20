import { AuthenticationHeader } from "@novorender/data-js-api";

import { store } from "app/store";

export async function getAuthHeader(): Promise<AuthenticationHeader> {
    const {
        auth: { accessToken },
    } = store.getState();

    if (!accessToken) {
        return { header: "", value: "" };
    }

    return { header: "Authorization", value: `Bearer ${accessToken}` };
}
