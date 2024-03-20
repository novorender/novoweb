import { AuthenticationHeader } from "@novorender/data-js-api";

export async function getAuthHeader(): Promise<AuthenticationHeader> {
    // const {
    //     auth: { accessToken },
    // } = store.getState();

    const accessToken = ""; //todo

    if (!accessToken) {
        return { header: "", value: "" };
    }

    return { header: "Authorization", value: `Bearer ${accessToken}` };
}
