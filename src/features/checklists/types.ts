import { type vec3 } from "gl-matrix";

export enum ChecklistItemType {
    Checkbox = "checkbox",
    YesNo = "yesNo",
    TrafficLight = "trafficLight",
    Dropdown = "dropdown",
    Text = "text",
}

export type ChecklistItem = SimpleItem | ItemWithOptions;

type BaseItem = {
    id?: string;
    title: string;
    required: boolean;
    value?: string[] | null;
    relevant?: boolean;
};

type SimpleItem = BaseItem & {
    type: Exclude<ChecklistItemType, ChecklistItemType.Dropdown | ChecklistItemType.Checkbox>;
};

type ItemWithOptions = BaseItem & {
    type: Exclude<ChecklistItemType, SimpleItem["type"]>;
    options: string[];
};

export type ProjectId = string;
export type TemplateId = string;
export type FormId = string;

type OffsetDateTime = string;

// In "ongoing" state indicates number of completed forms.
export type TemplateState = "new" | { ongoing: number } | "finished";
export type FormState = "new" | "ongoing" | "finished";

// TODO: Make sure this one is actually matching `FormField` variants on the backend.
export type FormField =
    | { type: "label"; id?: string; value: string; forId?: string }
    | {
          type: "text";
          id?: string;
          value?: string;
          defaultValue?: string;
          label?: string;
          required?: boolean;
          readonly?: boolean;
          placeholder?: string;
          minLength?: number;
          maxLength?: number;
          pattern?: string;
          size?: number;
      }
    | {
          type: "number";
          id?: string;
          value?: number;
          defaultValue?: number;
          required?: boolean;
          readonly?: boolean;
          min?: number;
          max?: number;
          step?: number;
      }
    | {
          type: "radioGroup";
          id?: string;
          label?: string;
          required?: boolean;
          value?: string;
          options: { label: string; value: string; checked?: boolean }[];
      }
    | { type: "checkbox"; id?: string; label?: string; value?: boolean; required?: boolean; readonly?: boolean }
    | {
          type: "textArea";
          id?: string;
          value?: string;
          defaultValue?: string;
          required?: boolean;
          readonly?: boolean;
          placeholder?: string;
          minLength?: number;
          maxLength?: number;
          rows?: number;
          cols?: number;
      }
    | {
          type: "select";
          id?: string;
          label?: string;
          required?: boolean;
          value?: string[];
          multiple?: boolean;
          options: { label: string; value: string; checked?: boolean }[];
      }
    | { type: "file"; id?: string; required?: boolean; readonly?: boolean; accept?: string[] };

export type FormObjectGuid = string;

export type FormObject = {
    id: number;
    guid: FormObjectGuid;
    position: vec3;
    name?: string;
};

export type Template = {
    id: TemplateId;
    title: string;
    readonly?: boolean;
    state?: TemplateState;
    fields: FormField[];
    objects: FormObject[];
    forms: { [key: FormObjectGuid]: FormState };
    created?: OffsetDateTime;
    modified?: OffsetDateTime;
};

export type Form = {
    id: FormId;
    title: string;
    fields: FormField[];
    readonly: boolean;
    state: FormState;
    created: OffsetDateTime;
    modified: OffsetDateTime;
};
