export enum StorageKey {
    NovoToken = "novoweb_token",
    MsalActiveAccount = "msal_active_account",
    BimCollabRefreshToken = "BIMcollab_refresh_token",
    BimCollabCodeVerifier = "BIMcollab_code_verifier",
    BimCollabSuggestedSpace = "BIMcollab_suggested_space",
}

export const storageConfig = {
    [StorageKey.BimCollabRefreshToken]: {
        storage: sessionStorage,
    },
    [StorageKey.BimCollabCodeVerifier]: {
        storage: sessionStorage,
    },
    [StorageKey.BimCollabSuggestedSpace]: {
        storage: sessionStorage,
    },
    [StorageKey.NovoToken]: {
        storage: localStorage,
    },
    [StorageKey.MsalActiveAccount]: {
        storage: localStorage,
    },
};
