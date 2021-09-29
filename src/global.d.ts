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
