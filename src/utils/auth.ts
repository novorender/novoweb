import { AuthenticationHeader } from "@novorender/data-js-api";
import { AccountInfo, NavigationClient, NavigationOptions } from "@azure/msal-browser";
import { History } from "history";

import { msalInstance } from "app";
import { store } from "app/store";
import { accountStorageKey, loginRequest, tokenStorageKey } from "config/auth";
import { authActions } from "slices/authSlice";

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

export function getStoredToken(): string {
    return localStorage.getItem(tokenStorageKey) ?? "";
}

export function storeToken(token: string): void {
    localStorage.setItem(tokenStorageKey, token);
}

export function deleteStoredToken(): void {
    return localStorage.removeItem(tokenStorageKey);
}

type SuccessfulLoginResponse = { token: string };
type FailedLoginResponse = { password: string } | { user: string };
type LoginResponse = SuccessfulLoginResponse | FailedLoginResponse;

export async function login(username: string, password: string): Promise<LoginResponse> {
    return fetch(`https://data.novorender.com/api/user/login`, {
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
        localStorage[accountStorageKey] = JSON.stringify(account);
    }
}

export function getStoredActiveAccount(): AccountInfo | undefined {
    try {
        const storedAccount = localStorage[accountStorageKey] ? JSON.parse(localStorage[accountStorageKey]) : undefined;

        if (storedAccount && "localAccountId" in storedAccount) {
            return storedAccount as AccountInfo;
        }
    } catch {}
}
