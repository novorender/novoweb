import { createApi } from "@reduxjs/toolkit/query/react";

import { getDataV2DynamicBaseQuery } from "apis/dataV2/utils";

import {
    type Form,
    type FormFileUploadResponse,
    type FormHistory,
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
    tagTypes: ["Template", "MinimalTemplate", "Form", "Object", "FormHistory"],
    keepUnusedDataFor: 60 * 5,
    endpoints: (builder) => ({
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
        updateTemplate: builder.mutation<
            Template,
            { projectId: ProjectId; templateId: TemplateId; template: Partial<Template> }
        >({
            query: ({ projectId, templateId, template }) => ({
                body: template,
                url: `projects/${projectId}/templates/${templateId}`,
                method: "PATCH",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
            }),
            invalidatesTags: (_result, _error, { projectId, templateId }) => [
                { type: "Template" as const, id: `${projectId}-${templateId}` },
                { type: "MinimalTemplate" as const, id: `${projectId}-${templateId}` },
                { type: "Form" as const, id: `LIST-${projectId}` },
                { type: "FormHistory" as const, id: `${projectId}-${templateId}` },
                // Invalidate geo forms
                ...Object.keys(_result?.forms ?? {}).map((formId: FormId) => ({
                    type: "Form" as const,
                    id: `${projectId}-${templateId}-${formId}`,
                })),
                // Invalidate object forms
                ...Object.keys(_result?.forms ?? {}).map((formId: FormId) => ({
                    type: "Form" as const,
                    id: `${projectId}-${formId}-${templateId}`,
                })),
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
        getTemplate: builder.query<Template, { projectId: ProjectId; templateId: TemplateId }>({
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
            providesTags: (result, _error, { projectId }) =>
                result
                    ? [
                          { type: "MinimalTemplate" as const, id: "LIST" },
                          ...result.map(({ id }) => ({ type: "MinimalTemplate" as const, id: `${projectId}-${id}` })),
                      ]
                    : [{ type: "MinimalTemplate" as const, id: "LIST" }],
        }),
        deleteTemplate: builder.mutation<void, { projectId: ProjectId; templateId: TemplateId }>({
            query: ({ projectId, templateId }) => ({
                url: `projects/${projectId}/templates/${templateId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _error, { projectId, templateId }) => [
                { type: "MinimalTemplate" as const, id: `${projectId}-${templateId}` },
            ],
        }),
        getFormHistory: builder.query<
            FormHistory,
            { projectId: ProjectId; templateType: TemplateType; id: FormObjectGuid | FormId; formId: FormId }
        >({
            query: ({ projectId, templateType, id, formId }) =>
                `projects/${projectId}/history/forms/${templateType}/${id}/${formId}`,
            providesTags: (_result, _error, { projectId, id, formId }) => [
                {
                    type: "FormHistory" as const,
                    id: `${projectId}-${id}-${formId}`,
                },
            ],
        }),
        revertForm: builder.mutation<
            Form,
            {
                projectId: ProjectId;
                templateType: TemplateType;
                id: FormObjectGuid | FormId;
                formId: FormId;
                version: number;
            }
        >({
            query: ({ projectId, templateType, id, formId, version }) => ({
                url: `projects/${projectId}/history/forms/${templateType}/${id}/${formId}/revert/${version}`,
                method: "POST",
            }),
            invalidatesTags: (_result, _error, { projectId, id, formId }) => [
                { type: "FormHistory" as const, id: `${projectId}-${id}-${formId}` },
                { type: "Form" as const, id: `${projectId}-${id}-${formId}` },
                { type: "Template" as const, id: `${projectId}-${id}` },
                { type: "MinimalTemplate" as const, id: `${projectId}-${id}` },
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
                { type: "MinimalTemplate" as const, id: "LIST" },
                { type: "Template" as const, id: `${projectId}-${formId}` },
                { type: "Form" as const, id: `LIST-${projectId}` },
                {
                    type: "Form" as const,
                    id: `${projectId}-${objectGuid}-${formId}`,
                },
                { type: "Form" as const, id: `${projectId}-${formId}` },
                { type: "FormHistory" as const, id: `${projectId}-${objectGuid}-${formId}` },
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
                {
                    type: "Form" as const,
                    id: `${projectId}-${objectGuid}-${formId}`,
                },
                { type: "Form" as const, id: `${projectId}-${formId}` },
                { type: "FormHistory" as const, id: `${projectId}-${objectGuid}-${formId}` },
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
                {
                    type: "Form" as const,
                    id: `${projectId}-${templateId}-${formId}`,
                },
                { type: "FormHistory" as const, id: `${projectId}-${templateId}-${formId}` },
            ],
            async onQueryStarted({ projectId, templateId, formId, form }, { dispatch, queryFulfilled }) {
                let patchTemplatesResult: { undo: () => void } | undefined;

                const patchTemplateResult = dispatch(
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

                            const newFormState = calculateFormState(form);
                            if (oldForm.state !== newFormState) {
                                patchTemplatesResult = dispatch(
                                    formsApi.util.updateQueryData("getMinimalTemplates", { projectId }, (draft) => {
                                        const template = draft.find((t) => t.id === templateId);
                                        if (template) {
                                            if (oldForm.state === "finished") {
                                                template.forms.finished -= 1;
                                            } else if (newFormState === "finished") {
                                                template.forms.finished += 1;
                                            }
                                        }
                                    }),
                                );
                            }

                            if (form.fields) {
                                oldForm.state = newFormState;
                            }
                        }
                    }),
                );

                try {
                    await queryFulfilled;
                } catch {
                    patchTemplateResult.undo();
                    patchTemplatesResult?.undo();
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
                { type: "Form" as const, id: `${projectId}-${templateId}-${formId}` },
                { type: "FormHistory" as const, id: `${projectId}-${templateId}-${formId}` },
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
            invalidatesTags: (_result, _error) => [{ type: "MinimalTemplate" as const, id: "LIST" }],
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
    useGetFormHistoryQuery,
    useRevertFormMutation,
    useUpdateTemplateMutation,
} = formsApi;
