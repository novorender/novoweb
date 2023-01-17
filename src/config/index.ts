export const dataServerBaseUrl =
    import.meta.env.REACT_APP_DATA_SERVER_URL || window.dataServerUrl || "https://data.novorender.com/api";
export const offscreenCanvas = "OffscreenCanvas" in window;
export const hasCreateImageBitmap = "createImageBitmap" in window;
