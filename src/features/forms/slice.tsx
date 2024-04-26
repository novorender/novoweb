import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

import { type RootState } from "app/store";
import { AsyncState, AsyncStatus } from "types/misc";

import { type FormGLtfAsset, type FormId, type FormRecord, type Template, type TemplateId } from "./types";

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
        object: true,
        geo: true,
    },
    // Templates are loading progressively so status doesn't matter,
    // but just in case we will ever load them all at once I leave it here
    templates: { status: AsyncStatus.Success, data: [] },
    assets: { status: AsyncStatus.Initial },
    selectedFormId: undefined,
} as {
    currentFormsList: string | null;
    locationForms: (FormRecord & { id: string; templateId: string })[];
    lastViewedPath: string;
    formFilters: {
        name: string;
        new: boolean;
        ongoing: boolean;
        finished: boolean;
    };
    templatesFilters: {
        name: string;
        object: boolean;
        geo: boolean;
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
        addLocationForms: (state, action: PayloadAction<State["locationForms"]>) => {
            const newForms = action.payload;
            state.locationForms = [
                ...state.locationForms.filter(
                    (f) => !newForms.some((nf) => nf.templateId === f.templateId && nf.id === f.id)
                ),
                ...newForms,
            ];
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
        removeLocationForm: (state, action: PayloadAction<{ templateId: TemplateId; formId: FormId }>) => {
            state.locationForms = state.locationForms.filter(
                (f) => f.templateId !== action.payload.templateId || f.id !== action.payload.formId
            );
        },
        removeLocationTemplate: (state, action: PayloadAction<TemplateId>) => {
            state.locationForms = state.locationForms.filter((f) => f.templateId !== action.payload);
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
