import { quat, vec3 } from "gl-matrix";

type ImageBase = {
    name: string;
    preview: string;
    guid: string;
};

export type FlatImage = ImageBase & {
    src: string;
    position: vec3;
};

export type PanoramaImage = ImageBase & {
    gltf: string;
    src: string;
    position: vec3;
    rotation?: quat;
};

export type Image = FlatImage | PanoramaImage;

export enum ImageType {
    Flat = "flat",
    Panorama = "panorama",
}
