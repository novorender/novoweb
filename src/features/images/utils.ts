import { FlatImage, Image, PanoramaImage } from "./types";

export function isPanorama(image: Image): image is PanoramaImage {
    return "gltf" in image;
}

export function isFlat(image: Image): image is FlatImage {
    return "src" in image;
}
