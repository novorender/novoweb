export enum StorageKey {
    NovoToken = "novoweb_token",
    MsalActiveAccount = "msal_active_account_a",
    BimCollabRefreshToken = "BIMcollab_refresh_token",
    BimCollabCodeVerifier = "BIMcollab_code_verifier",
    BimCollabSuggestedSpace = "BIMcollab_suggested_space",
    BimTrackRefreshToken = "BIMtrack_refresh_token",
    BimTrackCodeVerifier = "BIMtrack_code_verifier",
    DitioRefreshToken = "ditio_refresh_token",
    DitioCodeVerifier = "ditio_code_verifier",
    DrofusAccessToken = "drofus_access_token",
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
    [StorageKey.BimTrackRefreshToken]: {
        storage: sessionStorage,
    },
    [StorageKey.BimTrackCodeVerifier]: {
        storage: sessionStorage,
    },
    [StorageKey.DitioRefreshToken]: {
        storage: localStorage,
    },
    [StorageKey.DitioCodeVerifier]: {
        storage: sessionStorage,
    },
    [StorageKey.NovoToken]: {
        storage: localStorage,
    },
    [StorageKey.MsalActiveAccount]: {
        storage: localStorage,
    },
    [StorageKey.DrofusAccessToken]: {
        storage: localStorage,
    },
};
