import { SearchPattern } from "@novorender/webgl-api";
import { vec3 } from "gl-matrix";

export enum ChecklistItemType {
    Checkbox = "checkbox",
    YesNo = "yesNo",
    TrafficLight = "trafficLight",
    Dropdown = "dropdown",
    Text = "text",
}

export type ChecklistItem = SimpleItem | ItemWithOptions;

type BaseItem = {
    id: string;
    title: string;
    required: boolean;
};

type SimpleItem = BaseItem & {
    type: Exclude<ChecklistItemType, ChecklistItemType.Dropdown | ChecklistItemType.Checkbox>;
};

type ItemWithOptions = BaseItem & {
    type: Exclude<ChecklistItemType, SimpleItem["type"]>;
    options: string[];
};

export type InstancePreview = {
    searchPattern: SearchPattern[];
    completed: number;
    count: number;
};

export type Checklist = {
    id: string;
    title: string;
    items: ChecklistItem[];
    instances: InstancePreview;
};

export type ChecklistInstance = {
    id: string;
    name: string;
    objectId: number;
    position?: vec3;
    checklistId: string;
    items: { id: string; value: null | string[]; relevant: boolean }[];
};
