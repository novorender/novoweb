import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

import { type Form, type FormId, type FormObjectGuid, type ProjectId, type Template, type TemplateId } from "./types";

export const formsApi = createApi({
    reducerPath: "formsApi",
    baseQuery: fetchBaseQuery({ baseUrl: "https://formsdbapp.azurewebsites.net/api/v1/" }),
    tagTypes: ["Template", "Form", "Object"],
    keepUnusedDataFor: 60 * 5,
    endpoints: (builder) => ({
        listObjectsWithForms: builder.query<FormObjectGuid[], { projectId: ProjectId }>({
            query: ({ projectId }) => `projects/${projectId}/objects`,
            providesTags: [{ type: "Object" as const, id: "ID_LIST" }],
        }),
        listFormsForObject: builder.query<FormId[], { projectId: ProjectId; objectGuid: FormObjectGuid }>({
            query: ({ projectId, objectGuid }) => `projects/${projectId}/objects/${objectGuid}/forms/ids`,
            providesTags: (_result, _error, { projectId, objectGuid }) => [
                { type: "Form" as const, id: `ID_LIST-${projectId}-${objectGuid}` },
            ],
        }),
        listTemplates: builder.query<TemplateId[], { projectId: ProjectId }>({
            query: ({ projectId }) => `projects/${projectId}/templates/ids`,
            providesTags: [{ type: "Template" as const, id: "ID_LIST" }],
        }),
        getTemplates: builder.query<Template[], { projectId: ProjectId }>({
            query: ({ projectId }) => `projects/${projectId}/templates`,
            providesTags: (result, _error, { projectId }) =>
                result?.length
                    ? [
                          { type: "Template" as const, id: "LIST" },
                          ...result.map(({ id }) => ({ type: "Template" as const, id: `${projectId}-${id}` })),
                      ]
                    : [{ type: "Template" as const, id: "LIST" }],
        }),
        createForm: builder.mutation<TemplateId, { projectId: ProjectId; template: Partial<Template> }>({
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
                { type: "Form" as const, id: "LIST" },
                { type: "Template" as const, id: "LIST" },
                { type: "Template" as const, id: "ID_LIST" },
                { type: "Template" as const, id: `${projectId}-${result}` },
                { type: "Form" as const, id: `ID_LIST-${projectId}-${result}` },
                { type: "Form" as const, id: `LIST-${projectId}` },
            ],
        }),
        getForm: builder.query<Partial<Form>, { projectId: ProjectId; objectGuid: FormObjectGuid; formId: FormId }>({
            query: ({ projectId, objectGuid, formId }) => `projects/${projectId}/objects/${objectGuid}/forms/${formId}`,
            providesTags: (_result, _error, { projectId, objectGuid, formId }) => [
                {
                    type: "Form" as const,
                    id: `${projectId}-${objectGuid}-${formId}`,
                },
            ],
        }),
        getForms: builder.query<Partial<Form>[], { projectId: ProjectId; objectGuid: FormObjectGuid }>({
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
        updateForm: builder.mutation<
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
            invalidatesTags: (result, _error, { projectId, objectGuid, formId }) => [
                { type: "Form" as const, id: "LIST" },
                { type: "Form" as const, id: `${projectId}-${objectGuid}-${formId}` },
                { type: "Template" as const, id: `${projectId}-${formId}` },
            ],
        }),
    }),
});

export const {
    useListObjectsWithFormsQuery,
    useListTemplatesQuery,
    useListFormsForObjectQuery,
    useGetTemplatesQuery,
    useGetFormsQuery,
    useGetTemplateQuery,
    useCreateFormMutation,
    useGetFormQuery,
    useUpdateFormMutation,
} = formsApi;
