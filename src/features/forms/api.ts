import { createApi } from "@reduxjs/toolkit/query/react";

import { getDataV2DynamicBaseQuery } from "apis/dataV2/utils";

import {
    type Form,
    type FormId,
    type FormInstanceId,
    type FormObjectGuid,
    type ProjectId,
    type Template,
    type TemplateId,
} from "./types";

export const formsApi = createApi({
    reducerPath: "formsApi",
    baseQuery: getDataV2DynamicBaseQuery("/forms/"),
    tagTypes: ["Template", "Form", "Object"],
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
                { type: "Template" as const, id: `ID_LIST` },
                { type: "Template" as const, id: `${projectId}-${form.id}` },
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
            }
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
        updateSearchForm: builder.mutation<
            void,
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
                { type: "Template" as const, id: `${projectId}-${formId}` },
                { type: "Form" as const, id: `LIST-${projectId}` },
                {
                    type: "Form" as const,
                    id: `${projectId}-${objectGuid}-${formId}`,
                },
                { type: "Form" as const, id: `${projectId}-${formId}` },
            ],
        }),
        updateLocationForm: builder.mutation<
            void,
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
                { type: "Template" as const, id: "ID_LIST" },
                { type: "Template" as const, id: `${projectId}-${templateId}` },
                {
                    type: "Form" as const,
                    id: `${projectId}-${templateId}-${formId}`,
                },
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
    }),
});

export const {
    useListTemplatesQuery,
    useGetSearchFormQuery,
    useGetLocationFormQuery,
    useGetSearchFormsQuery,
    useGetTemplateQuery,
    useLazyGetTemplateQuery,
    useCreateSearchFormMutation,
    useCreateLocationFormMutation,
    useUpdateSearchFormMutation,
    useUpdateLocationFormMutation,
    useDeleteLocationFormMutation,
} = formsApi;
