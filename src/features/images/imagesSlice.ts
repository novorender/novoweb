import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { quat, vec3 } from "gl-matrix";

import { RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";

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
              image: Image;
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
        setShowMarkers: (state, action: PayloadAction<State["showMarkers"]>) => {
            state.showMarkers = action.payload;
        },
    },
});

export const selectImages = (state: RootState) => state.images.images;
export const selectActiveImage = (state: RootState) => state.images.activeImage;
export const selectShowImageMarkers = (state: RootState) => state.images.showMarkers;
export const selectImageFilter = (state: RootState) => state.images.filter;

const { actions, reducer } = imagesSlice;
export { actions as imagesActions, reducer as imagesReduces };
