import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import { quat, vec3 } from "gl-matrix";

import { RootState } from "app/store";
import { resetView } from "features/render";
import { AsyncState, AsyncStatus } from "types/misc";

import { isPanorama } from "./utils";

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

const initialState = {
    filter: {
        dateFrom: "",
        dateTo: "",
        type: "all" as "all" | ImageType,
    },
    images: { status: AsyncStatus.Initial } as AsyncState<Image[]>,
    activeImage: undefined as
        | undefined
        | {
              status: AsyncStatus.Loading | AsyncStatus.Success;
              image: FlatImage;
              mode: ImageType.Flat;
          }
        | {
              status: AsyncStatus.Loading | AsyncStatus.Success;
              image: PanoramaImage;
              mode: ImageType;
          },
    showMarkers: true,
};

type State = typeof initialState;
export type ImageFilter = State["filter"];

export const imagesSlice = createSlice({
    name: "images",
    initialState: initialState,
    reducers: {
        setImages: (state, action: PayloadAction<State["images"]>) => {
            state.images = action.payload;
        },
        setFilter: (state, action: PayloadAction<State["filter"]>) => {
            if (
                action.payload.dateFrom !== state.filter.dateFrom ||
                action.payload.dateTo !== state.filter.dateTo ||
                action.payload.type !== state.filter.type
            ) {
                state.images = { status: AsyncStatus.Initial };
            }

            state.filter = action.payload;
        },
        clearFilter: (state) => {
            state.filter = initialState.filter;
        },
        setActiveImage: (state, action: PayloadAction<State["activeImage"]>) => {
            state.activeImage = action.payload;
        },
        nextImage: (state) => {
            const guid = state.activeImage?.image.guid;

            if (!guid || state.images.status !== AsyncStatus.Success) {
                return state;
            }

            const images = state.images.data;

            if (images.length < 2) {
                return;
            }

            const idx = images.findIndex((img) => img.guid === guid);
            if (idx === -1) {
                return;
            }

            const img = images[idx + 1] ? images[idx + 1] : images[0];

            if (!img) {
                state.activeImage = undefined;
            }

            state.activeImage = { image: img, mode: ImageType.Flat, status: AsyncStatus.Loading };
        },
        prevImage: (state) => {
            const guid = state.activeImage?.image.guid;

            if (!guid || state.images.status !== AsyncStatus.Success) {
                return state;
            }

            const images = state.images.data;

            if (images.length < 2) {
                return;
            }

            const idx = images.findIndex((img) => img.guid === guid);
            if (idx === -1) {
                return;
            }

            const img = images[idx - 1] ? images[idx - 1] : images[images.length - 1];

            if (!img) {
                state.activeImage = undefined;
            }

            state.activeImage = { image: img, mode: ImageType.Flat, status: AsyncStatus.Loading };
        },
        swapMode: (state) => {
            if (!state.activeImage || !isPanorama(state.activeImage.image)) {
                return;
            }

            state.activeImage.mode = ImageType.Panorama;
            state.activeImage.status = AsyncStatus.Loading;
        },
        setShowMarkers: (state, action: PayloadAction<State["showMarkers"]>) => {
            state.showMarkers = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(resetView, (state) => {
            state.activeImage = undefined;
        });
    },
});

export const selectImages = (state: RootState) => state.images.images;
export const selectActiveImage = (state: RootState) => state.images.activeImage;
export const selectShowImageMarkers = (state: RootState) => state.images.showMarkers;
export const selectImageFilter = (state: RootState) => state.images.filter;
export const selectImagesData = createSelector(selectImages, (images) =>
    images.status === AsyncStatus.Success ? images.data : []
);

const { actions, reducer } = imagesSlice;
export { actions as imagesActions, reducer as imagesReduces };
