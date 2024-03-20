import { AuthenticationHeader } from "@novorender/data-js-api";

export async function getAuthHeader(): Promise<AuthenticationHeader> {
    // const {
    //     auth: { accessToken },
    // } = store.getState();

    // TODO
    const accessToken = "";

    if (!accessToken) {
        return { header: "", value: "" };
    }

    return { header: "Authorization", value: `Bearer ${accessToken}` };
}
