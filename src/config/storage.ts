export enum StorageKey {
    CodeVerifier = "nw_code_verifier",
    RefreshToken = "nw_refresh_token",
    BimCollabRefreshToken = "BIMcollab_refresh_token",
    BimCollabCodeVerifier = "BIMcollab_code_verifier",
    BimCollabSuggestedSpace = "BIMcollab_suggested_space",
    BimTrackRefreshToken = "BIMtrack_refresh_token",
    BimTrackCodeVerifier = "BIMtrack_code_verifier",
    DitioRefreshToken = "ditio_refresh_token",
    DitioCodeVerifier = "ditio_code_verifier",
    JiraRefreshToken = "jira_refresh_token",
    XsiteManageRefreshToken = "xsitemanage_refresh_token",
    Checklists = "POC_checklists",
    ChecklistInstances = "POC_checklist_instances",
}

export const storageConfig = {
    [StorageKey.XsiteManageRefreshToken]: {
        storage: localStorage,
    },
    [StorageKey.JiraRefreshToken]: {
        storage: localStorage,
    },
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
    [StorageKey.RefreshToken]: {
        storage: localStorage,
    },
    [StorageKey.CodeVerifier]: {
        storage: sessionStorage,
    },
    [StorageKey.Checklists]: {
        storage: localStorage,
    },
    [StorageKey.ChecklistInstances]: {
        storage: localStorage,
    },
};
