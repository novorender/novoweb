import { dataApi } from "apis/dataV1";
import { Permission } from "apis/dataV2/permissions";
import { WidgetKey } from "config/features";
import { User } from "slices/authSlice";
import { base64UrlEncode, generateRandomString, sha256 } from "utils/misc";

type SuccessfulLoginResponse = { token: string };
type FailedLoginResponse = { password: string } | { user: string };
type LoginResponse = SuccessfulLoginResponse | FailedLoginResponse | undefined;

export async function login(
    username: string,
    password: string
): Promise<undefined | (SuccessfulLoginResponse & { user: User })> {
    const res: LoginResponse = await fetch(dataApi.serviceUrl + "/user/login", {
        method: "post",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `username=${username}&password=${password}`,
    })
        .then((r) => r.json())
        .catch(() => undefined);

    if (!res) {
        throw new Error("An error occurred");
    }

    if (!("token" in res)) {
        throw new Error("Invalid username or password");
    }

    const user = await getUser(res.token);

    if (!user) {
        throw new Error("An error occurred");
    }

    return {
        token: res.token,
        user,
    };
}

export async function getAccessToken(token: string): Promise<string> {
    return fetch(dataApi.serviceUrl + "/user/token", {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    })
        .then((r) => r.text())
        .catch(() => "");
}

export async function getUser(accessToken: string): Promise<User | undefined> {
    return fetch(dataApi.serviceUrl + "/user", {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    })
        .then((r) => r.json())
        .catch(() => undefined);
}

export async function generateCodeChallenge(): Promise<[verifier: string, challenge: string]> {
    const verifier = generateRandomString();
    const hashed = await sha256(verifier);
    return [verifier, base64UrlEncode(hashed)];
}

type OAuthState = {
    service?: WidgetKey | "self";
    sceneId?: string;
    query?: string;
    space?: string;
    localBookmarkId?: string;
};

export function getOAuthState(): OAuthState | undefined {
    const stateKey = new URLSearchParams(window.location.search).get("state");

    if (!stateKey) {
        return;
    }

    const state = sessionStorage.getItem(stateKey);

    if (!state) {
        console.warn("OAuth state mismatch.");
        return;
    }

    try {
        return JSON.parse(state);
    } catch (e) {
        console.warn(e);
        return;
    }
}

export function createOAuthStateString(state: OAuthState): string {
    const id = window.crypto.randomUUID();
    const stateStr = JSON.stringify(state);
    sessionStorage.setItem(id, stateStr);

    return id;
}

export function checkPermission(permissions: Set<Permission>, permission: Permission) {
    // permissions are expected to have both explicit and implicit permissions,
    // so we don't have to check for parent permissions
    return permissions.has(permission);
}
