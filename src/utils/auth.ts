import { AuthenticationHeader } from "@novorender/data-js-api";
import { AccountInfo, NavigationClient, NavigationOptions } from "@azure/msal-browser";
import { History } from "history";

import { msalInstance } from "app";
import { store } from "app/store";
import { loginRequest } from "config/auth";
import { authActions } from "slices/authSlice";
import { sha256, base64UrlEncode } from "utils/misc";
import { getFromStorage, saveToStorage } from "./storage";
import { StorageKey } from "config/storage";
import { dataServerBaseUrl } from "config";

export async function getAuthHeader(): Promise<AuthenticationHeader> {
    const { auth } = store.getState();

    if (!auth.accessToken) {
        return { header: "", value: "" };
    }

    if (auth.msalAccount) {
        // checks expiry and refreshes token if needed
        try {
            const response = await msalInstance.acquireTokenSilent({ ...loginRequest, account: auth.msalAccount });
            store.dispatch(authActions.login({ accessToken: response.accessToken }));

            return { header: "Authorization", value: `Bearer ${response.accessToken}` };
        } catch {}
    }

    return { header: "Authorization", value: `Bearer ${auth.accessToken}` };
}

type SuccessfulLoginResponse = { token: string };
type FailedLoginResponse = { password: string } | { user: string };
type LoginResponse = SuccessfulLoginResponse | FailedLoginResponse;

export async function login(username: string, password: string): Promise<LoginResponse> {
    return fetch(dataServerBaseUrl + "/user/login", {
        method: "post",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `username=${username}&password=${password}`,
    }).then((r) => r.json());
}

/**
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-react/docs/performance.md
 */
export class CustomNavigationClient extends NavigationClient {
    private history: History;

    constructor(history: History) {
        super();
        this.history = history;
    }

    /**
     * Navigates to other pages within the same web application
     * You can use the useHistory hook provided by react-router-dom to take advantage of client-side routing
     * @param url
     * @param options
     */
    async navigateInternal(url: string, options: NavigationOptions) {
        const relativePath = url.replace(window.location.origin, "");
        if (options.noHistory) {
            this.history.replace(relativePath);
        } else {
            this.history.push(relativePath);
        }

        return false;
    }
}

export function storeActiveAccount(account: AccountInfo | null): void {
    if (account) {
        saveToStorage(StorageKey.MsalActiveAccount, JSON.stringify(account));
    }
}

export function getStoredActiveAccount(): AccountInfo | undefined {
    try {
        const storedAccount = getFromStorage(StorageKey.MsalActiveAccount)
            ? JSON.parse(getFromStorage(StorageKey.MsalActiveAccount))
            : undefined;

        if (storedAccount && "localAccountId" in storedAccount) {
            return storedAccount as AccountInfo;
        }
    } catch {}
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
    const hashed = await sha256(verifier);
    return base64UrlEncode(hashed);
}

type OAuthState = {
    service?: string;
    sceneId?: string;
    space?: string;
};

export function getOAuthState(): OAuthState | undefined {
    const state = new URLSearchParams(window.location.search).get("state");

    if (!state) {
        return;
    }

    try {
        return JSON.parse(state);
    } catch {
        return;
    }
}

export function createOAuthStateString(state: OAuthState): string {
    return JSON.stringify(state);
}
