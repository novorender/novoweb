import { Configuration, RedirectRequest, SilentRequest } from "@azure/msal-browser";

export const msalConfig: Configuration = {
    auth: {
        clientId: "074eb42a-f94a-4a97-b7ad-0a187eb57f96",
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: "localStorage",
        storeAuthStateInCookie: false,
    },
};

export const loginRequest: RedirectRequest | SilentRequest = {
    authority: "https://login.microsoftonline.com/organizations",
    scopes: [
        "api://074eb42a-f94a-4a97-b7ad-0a187eb57f96/resource.read",
        "api://074eb42a-f94a-4a97-b7ad-0a187eb57f96/scene.edit",
    ],
};
