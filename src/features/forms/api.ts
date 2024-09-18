import { createApi } from "@reduxjs/toolkit/query/react";

import { getDataV2DynamicBaseQuery } from "apis/dataV2/utils";

import {
    type Form,
    type FormFileUploadResponse,
    type FormId,
    type FormInstanceId,
    type FormObjectGuid,
    type MinimalTemplate,
    type ProjectId,
    type Template,
    type TemplateId,
    TemplateType,
} from "./types";
import { calculateFormState } from "./utils";

export const formsApi = createApi({
    reducerPath: "formsApi",
    baseQuery: getDataV2DynamicBaseQuery("/forms/"),
    tagTypes: ["Template", "MinimalTemplate", "Form", "Object"],
    keepUnusedDataFor: 60 * 5,
    endpoints: (builder) => ({
        listTemplates: builder.query<TemplateId[], { projectId: ProjectId }>({
            query: ({ projectId }) => `projects/${projectId}/templates/ids`,
            providesTags: [{ type: "Template" as const, id: "ID_LIST" }],
        }),
        createSearchForm: builder.mutation<TemplateId, { projectId: ProjectId; template: Partial<Template> }>({
            query: ({ projectId, template }) => ({
                body: template,
                url: `projects/${projectId}/forms`,
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            }),
            invalidatesTags: (result, _error, { projectId }) => [
                { type: "Template" as const, id: "ID_LIST" },
                { type: "MinimalTemplate" as const, id: "LIST" },
                { type: "Template" as const, id: `${projectId}-${result}` },
                { type: "Form" as const, id: `LIST-${projectId}` },
                { type: "Form" as const, id: `${projectId}-${result}` },
            ],
        }),
        createLocationForm: builder.mutation<FormInstanceId, { projectId: ProjectId; form: Partial<Form> }>({
            query: ({ projectId, form }) => ({
                body: form,
                url: `projects/${projectId}/location`,
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            }),
            invalidatesTags: (result, _error, { projectId, form }) => [
                { type: "Template" as const, id: "ID_LIST" },
                { type: "MinimalTemplate" as const, id: "LIST" },
                { type: "Template" as const, id: `${projectId}-${form.id}` },
                { type: "MinimalTemplate" as const, id: `${projectId}-${form.id}` },
                { type: "Form" as const, id: `${projectId}-${result}` },
                {
                    type: "Form" as const,
                    id: `${projectId}-${form.id}-${result}`,
                },
            ],
        }),
        getSearchForm: builder.query<
            Partial<Form>,
            { projectId: ProjectId; objectGuid: FormObjectGuid; formId: FormId }
        >({
            query: ({ projectId, objectGuid, formId }) => `projects/${projectId}/objects/${objectGuid}/forms/${formId}`,
            providesTags: (_result, _error, { projectId, objectGuid, formId }) => [
                {
                    type: "Form" as const,
                    id: `${projectId}-${objectGuid}-${formId}`,
                },
            ],
        }),
        getLocationForm: builder.query<Partial<Form>, { projectId: ProjectId; templateId: TemplateId; formId: FormId }>(
            {
                query: ({ projectId, templateId, formId }) => `projects/${projectId}/location/${templateId}/${formId}`,
                providesTags: (_result, _error, { projectId, templateId, formId }) => [
                    {
                        type: "Form" as const,
                        id: `${projectId}-${templateId}-${formId}`,
                    },
                ],
            },
        ),
        getSearchForms: builder.query<Partial<Form>[], { projectId: ProjectId; objectGuid: FormObjectGuid }>({
            query: ({ projectId, objectGuid }) => `projects/${projectId}/objects/${objectGuid}/forms`,
            providesTags: (result, _error, { projectId, objectGuid }) =>
                result?.length
                    ? [
                          { type: "Form" as const, id: `LIST-${projectId}` },
                          ...result.map(({ id }) => ({
                              type: "Form" as const,
                              id: `${projectId}-${objectGuid}-${id}`,
                          })),
                      ]
                    : [{ type: "Form" as const, id: `LIST-${projectId}` }],
        }),
        getTemplate: builder.query<Partial<Template>, { projectId: ProjectId; templateId: TemplateId }>({
            query: ({ projectId, templateId }) => `projects/${projectId}/templates/${templateId}`,
            providesTags: (_result, _error, { projectId, templateId }) => [
                { type: "Template" as const, id: `${projectId}-${templateId}` },
            ],
        }),
        getMinimalTemplate: builder.query<MinimalTemplate, { projectId: ProjectId; templateId: TemplateId }>({
            query: ({ projectId, templateId }) => `projects/${projectId}/templates/${templateId}?minimal=true`,
            providesTags: (_result, _error, { projectId, templateId }) => [
                { type: "MinimalTemplate" as const, id: `${projectId}-${templateId}` },
            ],
        }),
        getTemplates: builder.query<
            (Partial<Template> & { id: FormId })[],
            { projectId: ProjectId; type?: TemplateType }
        >({
            query: ({ projectId, ...params }) => {
                const sp = new URLSearchParams(params as Record<string, string>).toString();
                const queryString = params ? `?${sp}` : "";
                return `projects/${projectId}/templates${queryString}`;
            },
            providesTags: (result, _error, { projectId }) =>
                result ? result.map(({ id }) => ({ type: "Template" as const, id: `${projectId}-${id}` })) : [],
        }),
        getMinimalTemplates: builder.query<MinimalTemplate[], { projectId: ProjectId; type?: TemplateType }>({
            query: ({ projectId, ...params }) => {
                const sp = new URLSearchParams({ minimal: "true", ...params } as Record<string, string>).toString();
                const queryString = params ? `?${sp}` : "";
                return `projects/${projectId}/templates${queryString}`;
            },
            providesTags: [{ type: "MinimalTemplate" as const, id: "LIST" }],
        }),
        deleteTemplate: builder.mutation<void, { projectId: ProjectId; templateId: TemplateId }>({
            query: ({ projectId, templateId }) => ({
                url: `projects/${projectId}/templates/${templateId}`,
                method: "DELETE",
            }),
            invalidatesTags: () => [
                { type: "Template" as const, id: "ID_LIST" },
                { type: "MinimalTemplate" as const, id: "LIST" },
            ],
        }),
        updateSearchForm: builder.mutation<
            Form,
            { projectId: ProjectId; formId: FormId; objectGuid: FormObjectGuid; form: Partial<Form> }
        >({
            query: ({ projectId, objectGuid, formId, form }) => ({
                body: form,
                url: `projects/${projectId}/objects/${objectGuid}/forms/${formId}`,
                method: "PATCH",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            }),
            invalidatesTags: (_result, _error, { projectId, objectGuid, formId }) => [
                { type: "Template" as const, id: "ID_LIST" },
                { type: "MinimalTemplate" as const, id: "LIST" },
                { type: "Template" as const, id: `${projectId}-${formId}` },
                { type: "Form" as const, id: `LIST-${projectId}` },
                {
                    type: "Form" as const,
                    id: `${projectId}-${objectGuid}-${formId}`,
                },
                { type: "Form" as const, id: `${projectId}-${formId}` },
            ],
        }),
        signSearchForm: builder.mutation<
            void,
            { projectId: ProjectId; objectGuid: FormObjectGuid; formId: FormId; isFinal?: boolean }
        >({
            query: ({ projectId, objectGuid, formId, isFinal = false }) => ({
                body: { isFinal },
                url: `projects/${projectId}/objects/${objectGuid}/forms/${formId}/sign`,
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            }),
            invalidatesTags: (_result, _error, { projectId, objectGuid, formId }) => [
                // { type: "MinimalTemplate" as const, id: "LIST" },
                // { type: "Template" as const, id: `${projectId}-${formId}` },
                {
                    type: "Form" as const,
                    id: `${projectId}-${objectGuid}-${formId}`,
                },
                { type: "Form" as const, id: `${projectId}-${formId}` },
            ],
        }),
        updateLocationForm: builder.mutation<
            Form,
            { projectId: ProjectId; formId: FormId; templateId: TemplateId; form: Partial<Form> }
        >({
            query: ({ projectId, templateId, formId, form }) => ({
                body: form,
                url: `projects/${projectId}/location/${templateId}/${formId}`,
                method: "PATCH",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            }),
            invalidatesTags: (_result, _error, { projectId, templateId, formId }) => [
                // Instead of invalidating - optimistically update state to avoid flickering
                // { type: "Template" as const, id: `${projectId}-${templateId}` },
                // { type: "MinimalTemplate" as const, id: `${projectId}-${templateId}` },
                {
                    type: "Form" as const,
                    id: `${projectId}-${templateId}-${formId}`,
                },
            ],
            async onQueryStarted({ projectId, templateId, formId, form }, { dispatch, queryFulfilled }) {
                const patchResult = dispatch(
                    formsApi.util.updateQueryData("getTemplate", { projectId, templateId }, (draft) => {
                        const oldForm = draft.forms?.[formId];
                        if (oldForm) {
                            if (form.title) {
                                oldForm.title = form.title;
                            }
                            if (form.location) {
                                oldForm.location = form.location;
                            }
                            if (form.rotation) {
                                oldForm.rotation = form.rotation;
                            }
                            if (form.scale) {
                                oldForm.scale = form.scale;
                            }
                            if (form.fields) {
                                oldForm.state = calculateFormState(form);
                            }
                        }
                    }),
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchResult.undo();
                }
            },
        }),
        signLocationForm: builder.mutation<
            void,
            { projectId: ProjectId; templateId: TemplateId; formId: FormId; isFinal?: boolean }
        >({
            query: ({ projectId, templateId, formId, isFinal = false }) => ({
                body: { isFinal },
                url: `projects/${projectId}/location/${templateId}/${formId}/sign`,
                method: "POST",
            }),
            invalidatesTags: (_result, _error, { projectId, templateId, formId }) => [
                // { type: "Template" as const, id: `${projectId}-${templateId}` },
                // { type: "MinimalTemplate" as const, id: `${projectId}-${templateId}` },
                { type: "Form" as const, id: `${projectId}-${templateId}-${formId}` },
            ],
        }),
        deleteLocationForm: builder.mutation<void, { projectId: ProjectId; templateId: TemplateId; formId: FormId }>({
            query: ({ projectId, templateId, formId }) => ({
                url: `projects/${projectId}/location/${templateId}/${formId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, { projectId, templateId }) => [
                { type: "Template" as const, id: `${projectId}-${templateId}` },
            ],
        }),
        deleteAllForms: builder.mutation<void, { projectId: ProjectId }>({
            query: ({ projectId }) => ({
                url: `projects/${projectId}/forms`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error) => [
                { type: "Template" as const, id: "ID_LIST" },
                { type: "MinimalTemplate" as const, id: "LIST" },
            ],
        }),
        uploadFiles: builder.mutation<
            { [key: string]: FormFileUploadResponse },
            { projectId: ProjectId; files: File[]; template?: boolean }
        >({
            query: ({ projectId, files, template = false }) => {
                const filesData = new FormData();
                for (const file of files) {
                    filesData.append(file.name, file);
                }
                return {
                    body: filesData,
                    url: `projects/${projectId}/files?template=${template}`,
                    method: "POST",
                    formData: true,
                };
            },
        }),
    }),
});

export const {
    useListTemplatesQuery,
    useGetSearchFormQuery,
    useGetLocationFormQuery,
    useGetSearchFormsQuery,
    useGetTemplateQuery,
    useCreateSearchFormMutation,
    useCreateLocationFormMutation,
    useUpdateSearchFormMutation,
    useUpdateLocationFormMutation,
    useDeleteLocationFormMutation,
    useDeleteTemplateMutation,
    useDeleteAllFormsMutation,
    useUploadFilesMutation,
    useGetTemplatesQuery,
    useGetMinimalTemplatesQuery,
    useLazyGetTemplatesQuery,
    useLazyGetTemplateQuery,
    useSignSearchFormMutation,
    useSignLocationFormMutation,
} = formsApi;
