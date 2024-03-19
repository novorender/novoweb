import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";

import { Form, FormGLtfAsset, Template } from "./types";

const initialState = {
    currentFormsList: null,
    locationForms: [],
    lastViewedPath: "/",
    formFilters: {
        name: "",
        new: true,
        ongoing: true,
        finished: true,
    },
    templatesFilters: {
        name: "",
        search: true,
        location: true,
    },
    // Templates are loading progressively so status doesn't matter,
    // but just in case we will ever load them all at once I leave it here
    templates: { status: AsyncStatus.Success, data: [] },
    assets: { status: AsyncStatus.Initial },
    selectedFormId: undefined,
} as {
    currentFormsList: string | null;
    locationForms: { templateId: string; form: Partial<Form> }[];
    lastViewedPath: string;
    formFilters: {
        name: string;
        new: boolean;
        ongoing: boolean;
        finished: boolean;
    };
    templatesFilters: {
        name: string;
        search: boolean;
        location: boolean;
    };
    templates: AsyncState<Partial<Template>[]>;
    assets: AsyncState<FormGLtfAsset[]>;
    selectedFormId: string | undefined;
};

type State = typeof initialState;
export type FormFilters = State["formFilters"];
export type TemplatesFilters = State["templatesFilters"];

export const formsSlice = createSlice({
    name: "forms",
    initialState: initialState,
    reducers: {
        setLastViewedPath: (state, action: PayloadAction<State["lastViewedPath"]>) => {
            state.lastViewedPath = action.payload;
        },
        setCurrentFormsList: (state, action: PayloadAction<State["currentFormsList"]>) => {
            state.currentFormsList = action.payload;
        },
        setLocationForms: (state, action: PayloadAction<State["locationForms"]>) => {
            state.locationForms = action.payload;
        },
        setSelectedFormId: (state, action: PayloadAction<State["selectedFormId"]>) => {
            state.selectedFormId = action.payload;
        },
        templateLoaded: (state, action: PayloadAction<Partial<Template>>) => {
            if (state.templates.status !== AsyncStatus.Success) {
                return;
            }
            const template = action.payload;
            state.templates = {
                status: AsyncStatus.Success,
                data: [...state.templates.data.filter((t) => t.id !== template.id), template],
            };
        },
        setAssets: (state, action: PayloadAction<State["assets"]>) => {
            state.assets = action.payload;
        },
        setFormFilters: (state, action: PayloadAction<Partial<State["formFilters"]>>) => {
            state.formFilters = {
                ...state.formFilters,
                ...action.payload,
            };
        },
        resetFormFilters: (state) => {
            state.formFilters = initialState.formFilters;
        },
        toggleFormFilter: (state, action: PayloadAction<Exclude<keyof State["formFilters"], "name">>) => {
            state.formFilters[action.payload] = !state.formFilters[action.payload];
        },
        setTemplatesFilters: (state, action: PayloadAction<Partial<State["templatesFilters"]>>) => {
            state.templatesFilters = {
                ...state.templatesFilters,
                ...action.payload,
            };
        },
        resetTemplatesFilters: (state) => {
            state.templatesFilters = initialState.templatesFilters;
        },
        toggleTemplatesFilter: (state, action: PayloadAction<Exclude<keyof State["templatesFilters"], "name">>) => {
            state.templatesFilters[action.payload] = !state.templatesFilters[action.payload];
        },
    },
});

export const selectLastViewedPath = (state: RootState) => state.forms.lastViewedPath;

export const selectCurrentFormsList = (state: RootState) => state.forms.currentFormsList;

export const selectTemplates = (state: RootState) => state.forms.templates;

export const selectCurrentTemplate = createSelector([selectTemplates, selectCurrentFormsList], (templates, id) =>
    id && templates.status === AsyncStatus.Success ? templates.data.find((t) => t.id === id) : undefined
);

export const selectFormFilters = (state: RootState) => state.forms.formFilters;

export const selectTemplatesFilters = (state: RootState) => state.forms.templatesFilters;

export const selectLocationForms = (state: RootState) => state.forms.locationForms;

export const selectAssets = (state: RootState) => state.forms.assets;

export const selectSelectedFormId = (state: RootState) => state.forms.selectedFormId;

const { actions, reducer } = formsSlice;
export { actions as formsActions, reducer as formsReducer };
