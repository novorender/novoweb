import { type ObjectDB } from "@novorender/data-js-api";
import { type HierarcicalObjectReference, type ObjectData, type ObjectId } from "@novorender/webgl-api";

import { HighlightCollection } from "contexts/highlightCollections";
import { searchByPatterns } from "utils/search";
import { sleep, toLocalISOString } from "utils/time";

import {
    DateTimeItem,
    type Form,
    type FormField,
    type FormItem,
    FormItemType,
    type FormObject,
    type FormObjectGuid,
    type FormsFile,
    type FormState,
} from "./types";

function uniqueByGuid(objects: FormObject[]): FormObject[] {
    const guidSet = new Set();
    const uniqueObjects = [];

    for (const object of objects) {
        if (!guidSet.has(object.guid)) {
            guidSet.add(object.guid);
            uniqueObjects.push(object);
        }
    }

    return uniqueObjects;
}

function getFormObject(ref: HierarcicalObjectReference): FormObject {
    const obj = ref as ObjectData;
    const guid = obj.properties.find((prop) => prop[0] === "GUID")?.[1] ?? "";
    const position = obj.bounds?.sphere.center ?? [0, 0, 0];
    return { id: obj.id, guid, position, name: obj.name };
}

const idsToObjectsCache = new Map<number, FormObject>();

export async function idsToObjects({
    ids,
    db,
    abortSignal,
}: {
    ids: ObjectId[];
    db: ObjectDB;
    abortSignal: AbortSignal;
}): Promise<FormObject[]> {
    if (!ids.length) {
        return [];
    }

    const MAX_CACHE_SIZE = 1000;
    const useCache = ids.length <= MAX_CACHE_SIZE;

    let objects = [] as FormObject[];
    const knownIds = [] as ObjectId[];
    let unknownIds = [] as ObjectId[];
    if (useCache) {
        ids.forEach((id) => {
            if (idsToObjectsCache.has(id)) {
                knownIds.push(id);
            } else {
                unknownIds.push(id);
            }
        });
    } else {
        unknownIds = ids;
    }

    const batchSize = 100;
    const batches = unknownIds.reduce(
        (acc, id) => {
            const lastBatch = acc.slice(-1)[0];

            if (lastBatch.length < batchSize) {
                lastBatch.push(String(id));
            } else {
                acc.push([String(id)]);
            }

            return acc;
        },
        [[]] as string[][],
    );

    const concurrentRequests = 5;
    const callback = async (refs: HierarcicalObjectReference[]) => {
        objects = objects.concat(refs.map(getFormObject));
    };

    for (let i = 0; i < batches.length / concurrentRequests; i++) {
        await Promise.all(
            batches.slice(i * concurrentRequests, i * concurrentRequests + concurrentRequests).map((batch) => {
                return searchByPatterns({
                    db,
                    abortSignal,
                    callback,
                    full: true,
                    searchPatterns: [
                        {
                            property: "id",
                            value: batch,
                            exact: true,
                        },
                    ],
                }).catch(() => {});
            }),
        );

        await sleep(1);
    }

    if (useCache) {
        if (idsToObjectsCache.size > MAX_CACHE_SIZE) {
            idsToObjectsCache.clear();
        }

        if (objects.length === unknownIds.length) {
            objects.forEach((object, idx) => {
                idsToObjectsCache.set(unknownIds[idx], object);
            });
        }

        knownIds.forEach((id) => {
            objects.push(idsToObjectsCache.get(id)!);
        });
    }

    return uniqueByGuid(objects);
}

const mapGuidsToIdsCache = new Map<string, ObjectId>();

export async function mapGuidsToIds({
    guids,
    db,
    abortSignal,
}: {
    guids: string[];
    db: ObjectDB;
    abortSignal: AbortSignal;
}) {
    if (!guids.length) {
        return {};
    }

    const MAX_CACHE_SIZE = 1000;
    const useCache = guids.length <= MAX_CACHE_SIZE;

    const map = {} as Record<FormObjectGuid, ObjectId>;
    const knownGuids = [] as FormObjectGuid[];
    let unknownGuids = [] as FormObjectGuid[];

    if (useCache) {
        guids.forEach((guid) => {
            if (mapGuidsToIdsCache.has(guid)) {
                knownGuids.push(guid);
            } else {
                unknownGuids.push(guid);
            }
        });
    } else {
        unknownGuids = guids;
    }

    const batchSize = 100;
    const batches = unknownGuids.reduce(
        (acc, guid) => {
            const lastBatch = acc.slice(-1)[0];

            if (lastBatch.length < batchSize) {
                lastBatch.push(guid);
            } else {
                acc.push([guid]);
            }

            return acc;
        },
        [[]] as string[][],
    );

    const concurrentRequests = 5;
    const callback = (objects: HierarcicalObjectReference[]) => {
        objects.forEach((obj) => {
            const guid = (obj as ObjectData).properties.find((prop) => prop[0] === "GUID")?.[1];
            if (guid) {
                map[guid] = obj.id;
                if (useCache) {
                    mapGuidsToIdsCache.set(guid, obj.id);
                }
            }
        });
    };
    for (let i = 0; i < batches.length / concurrentRequests; i++) {
        await Promise.all(
            batches.slice(i * concurrentRequests, i * concurrentRequests + concurrentRequests).map((batch) => {
                return searchByPatterns({
                    db,
                    callback,
                    abortSignal,
                    searchPatterns: [
                        {
                            property: "guid",
                            value: batch,
                            exact: true,
                        },
                    ],
                    full: true,
                }).catch(() => {});
            }),
        );

        await sleep(1);
    }

    if (useCache) {
        if (mapGuidsToIdsCache.size > MAX_CACHE_SIZE) {
            mapGuidsToIdsCache.clear();
        }

        knownGuids.forEach((guid) => {
            map[guid] = mapGuidsToIdsCache.get(guid)!;
        });
    }

    return map;
}

function toFormField(item: FormItem): FormField {
    if (item.type === FormItemType.Input) {
        return {
            type: "text",
            label: item.title,
            required: item.required,
            property: item.property,
            ...(item.id ? { id: item.id } : {}),
            ...(item.value?.length ? { value: item.value[0] } : item.value === null ? { value: "" } : {}),
        };
    }
    if (item.type === FormItemType.TrafficLight) {
        return {
            type: "radioGroup",
            label: item.title,
            required: item.required,
            options: [
                { label: "Green", value: "green" },
                { label: "Yellow", value: "yellow" },
                { label: "Red", value: "red" },
            ],
            ...(item.id ? { id: item.id } : {}),
            ...(item.value?.length ? { value: item.value[0] } : {}),
        };
    }
    if (item.type === FormItemType.YesNo) {
        return {
            type: "checkbox",
            label: item.title,
            required: item.required,
            ...(item.id ? { id: item.id } : {}),
            ...(item.value?.length ? { value: item.value[0].toLowerCase() === "yes" } : {}),
        };
    }
    if (item.type === FormItemType.Dropdown) {
        return {
            type: "select",
            label: item.title,
            required: item.required,
            property: item.property,
            options: item.options.map((option) => ({
                label: option,
                value: option,
            })),
            ...(item.id ? { id: item.id } : {}),
            ...(item.value?.length ? { value: item.value } : item.value === null ? { value: [] } : {}),
        };
    }
    if (item.type === FormItemType.Checkbox) {
        return {
            type: "select",
            multiple: true,
            label: item.title,
            required: item.required,
            property: item.property,
            options: item.options.map((option) => ({
                label: option,
                value: option,
            })),
            ...(item.id ? { id: item.id } : {}),
            ...(item.value?.length ? { value: item.value } : { value: [] }),
        };
    }
    if (item.type === FormItemType.Text) {
        return {
            type: "label",
            label: item.title,
            value: item.value?.length ? item.value[0] : "",
            property: item.property,
            ...(item.id ? { id: item.id } : {}),
        };
    }
    if ([FormItemType.Date, FormItemType.Time, FormItemType.DateTime].includes(item.type)) {
        return {
            type: item.type as FormItemType.Date | FormItemType.Time | FormItemType.DateTime,
            label: item.title,
            value: toLocalISOString(item.value as Date),
            required: item.required,
            readonly: (item as DateTimeItem).readonly,
            defaultValue: toLocalISOString((item as DateTimeItem).defaultValue),
            min: toLocalISOString((item as DateTimeItem).min),
            max: toLocalISOString((item as DateTimeItem).max),
            step: (item as DateTimeItem).step,
            ...(item.id ? { id: item.id } : {}),
        };
    }
    if (item.type === FormItemType.File) {
        // NOTE: Mapping the value is required to serialize it later
        return {
            type: "file",
            label: item.title,
            accept: item.accept,
            multiple: item.multiple,
            required: item.required,
            readonly: item.readonly,
            value: item.value?.map((f) => ({
                lastModified: f.lastModified,
                name: f.name,
                size: f.size,
                type: f.type,
                checksum: f.checksum,
                url: f.url,
            })) as FormsFile[],
            ...(item.id ? { id: item.id } : {}),
        };
    }
    throw new Error(`Unknown form item type: ${item.type}`);
}

export function toFormFields(items: FormItem[]): FormField[] {
    return items.map(toFormField);
}

function toFormItem(field: FormField): FormItem {
    if (field.type === "text") {
        return {
            type: FormItemType.Input,
            title: field.label ?? "",
            required: field.required ?? false,
            readonly: field.readonly ?? false,
            property: field.property,
            ...(field.id ? { id: field.id } : {}),
            ...(field.value ? { value: [field.value] } : {}),
        };
    }
    if (field.type === "radioGroup") {
        return {
            type: FormItemType.TrafficLight,
            title: field.label ?? "",
            required: field.required ?? false,
            readonly: field.readonly ?? false,
            property: field.property,
            ...(field.id ? { id: field.id } : {}),
            ...(field.value ? { value: [field.value] } : {}),
        };
    }
    if (field.type === "checkbox") {
        return {
            type: FormItemType.YesNo,
            title: field.label ?? "",
            required: field.required ?? false,
            readonly: field.readonly ?? false,
            ...(field.id ? { id: field.id } : {}),
            ...(typeof field.value === "boolean" ? { value: [field.value ? "yes" : "no"] } : {}),
        };
    }
    if (field.type === "select") {
        return {
            type: field.multiple ? FormItemType.Checkbox : FormItemType.Dropdown,
            title: field.label ?? "",
            required: field.required ?? false,
            readonly: field.readonly ?? false,
            options: field.options.map((option) => option.value),
            property: field.property,
            ...(field.id ? { id: field.id } : {}),
            ...(field.value ? { value: field.value } : field.value === null ? { value: [] } : {}),
        };
    }
    if (field.type === "label") {
        return {
            type: FormItemType.Text,
            title: field.label ?? "",
            value: field.value ? [field.value] : [],
            required: true,
            readonly: true,
            property: field.property,
            ...(field.id ? { id: field.id } : {}),
        };
    }
    if (["date", "time", "dateTime"].includes(field.type)) {
        type DateTime = Extract<FormField, { type: "dateTime" | "date" | "time" }>;
        return {
            type: field.type,
            title: (field as DateTime).label ?? "",
            value: field.value ? new Date(field.value as string) : undefined,
            defaultValue: field.defaultValue ? new Date(field.defaultValue as string) : undefined,
            required: field.required ?? false,
            readonly: field.readonly ?? false,
            min: (field as DateTime).min ? new Date((field as DateTime).min as string) : undefined,
            max: (field as DateTime).max ? new Date((field as DateTime).max as string) : undefined,
            step: (field as DateTime).step,
            ...(field.id ? { id: field.id } : {}),
        } as DateTimeItem;
    }
    if (field.type === "file") {
        return {
            type: FormItemType.File,
            title: field.label ?? "",
            value: field.value,
            defaultValue: field.defaultValue,
            required: field.required ?? false,
            readonly: field.readonly ?? false,
            accept: field.accept ?? "",
            multiple: field.multiple ?? false,
            directory: field.directory ?? false,
            ...(field.id ? { id: field.id } : {}),
        };
    }
    throw new Error(`Unknown form field type: ${field.type}`);
}

export function toFormItems(fields: FormField[]): FormItem[] {
    return fields.map(toFormItem);
}

export function getFormItemTypeDisplayName(type: FormItemType): string {
    switch (type) {
        case FormItemType.YesNo:
            return "Yes / No";
        case FormItemType.TrafficLight:
            return "Traffic light";
        case FormItemType.DateTime:
            return "Date and time";
        default:
            return type[0].toUpperCase() + type.slice(1);
    }
}

export function calculateFormState(form: Partial<Form>): FormState {
    let allRequiredFilled = true;
    form.fields?.forEach((field) => {
        const isFilled = isFormFieldFilled(field);
        if (isFormFieldRequired(field)) {
            allRequiredFilled &&= isFilled;
        }
    });

    // We don't consider "new" state here, because
    // in case the form was patched, it should be considered as "ongoing"
    return allRequiredFilled ? "finished" : "ongoing";
}

function isFormFieldFilled(field: FormField): boolean {
    switch (field.type) {
        case "text":
        case "radioGroup":
        case "textArea":
            return Boolean(field.value);
        case "number":
            return typeof field.value === "number";
        case "checkbox":
            return typeof field.value === "boolean";
        case "select":
        case "file":
        case "date":
        case "time":
        case "dateTime":
            return (field.value?.length ?? 0) > 0;
        default:
            return false;
    }
}

function isFormFieldRequired(field: FormField): boolean {
    switch (field.type) {
        case "text":
        case "radioGroup":
        case "textArea":
        case "number":
        case "checkbox":
        case "select":
        case "file":
        case "date":
        case "time":
        case "dateTime":
            return field.required ?? false;
        default:
            return false;
    }
}

export function determineHighlightCollection(form: Form): HighlightCollection {
    if (form.state === "ongoing") {
        return HighlightCollection.FormsOngoing;
    }
    if (form.state === "finished") {
        return HighlightCollection.FormsCompleted;
    }
    return HighlightCollection.FormsNew;
}
