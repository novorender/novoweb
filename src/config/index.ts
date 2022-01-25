export const dataServerBaseUrl =
    process.env.REACT_APP_DATA_SERVER_URL || (window as any).dataServerUrl || "https://localhost:5000/api";
export const offscreenCanvas = "OffscreenCanvas" in window;
export const hasCreateImageBitmap = "createImageBitmap" in window;
