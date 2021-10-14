interface Window {
    // For Cypress only
    Cypress?: any;
    store?: any;
    contexts?: any;

    // Debug
    showStats?: (state?: boolean) => void;
    disableTaa?: (state?: boolean) => void;
    disableSsao?: (state?: boolean) => void;
}

interface Document {
    webkitFullscreenElement?: Element | null;
    webkitExitFullscreen?: () => void;
    onwebkitfullscreenchange?: (() => void) | null;
}

interface Element {
    webkitRequestFullscreen?: () => void;
}
