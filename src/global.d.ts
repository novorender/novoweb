interface Window {
    // Env
    bimCollabClientId?: string;
    bimCollabClientSecret?: string;
    bimTrackClientId?: string;
    bimTrackClientSecret?: string;
    dataServerUrl?: string;

    // For Cypress only
    Cypress?: any;
    store?: any;
    appFullyRendered?: any;
    contexts?: any;
}
