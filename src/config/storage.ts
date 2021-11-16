export enum StorageKey {
    NovoToken = "novoweb_token",
    MsalActiveAccount = "msal_active_account",
    BimCollabRefreshToken = "BIMcollab_refresh_token",
    BimCollabCodeVerifier = "BIMcollab_code_verifier",
    ShowPerformanceStats = "show-performance-stats",
    DisableTaa = "disable-taa",
    DisableSssao = "disable-ssao",
}

export const storageConfig = {
    [StorageKey.BimCollabRefreshToken]: {
        storage: localStorage,
    },
    [StorageKey.BimCollabCodeVerifier]: {
        storage: sessionStorage,
    },
    [StorageKey.NovoToken]: {
        storage: localStorage,
    },
    [StorageKey.MsalActiveAccount]: {
        storage: localStorage,
    },
    [StorageKey.ShowPerformanceStats]: {
        storage: localStorage,
    },
    [StorageKey.DisableTaa]: {
        storage: localStorage,
    },
    [StorageKey.DisableSssao]: {
        storage: localStorage,
    },
};
