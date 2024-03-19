import { type vec3 } from "gl-matrix";

export enum FormItemType {
    Checkbox = "checkbox",
    YesNo = "yesNo",
    TrafficLight = "trafficLight",
    Dropdown = "dropdown",
    Input = "input",
    Text = "text",
}

export type FormItem = SimpleItem | ItemWithOptions;

type BaseItem = {
    id?: string;
    title: string;
    required: boolean;
    value?: string[] | null;
    relevant?: boolean;
};

type SimpleItem = BaseItem & {
    type: Exclude<FormItemType, FormItemType.Dropdown | FormItemType.Checkbox>;
};

type ItemWithOptions = BaseItem & {
    type: Exclude<FormItemType, SimpleItem["type"]>;
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
    | { type: "label"; id?: string; label?: string; value: string; forId?: string }
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

type ChangeStamp = {
    userId: string;
    timestamp?: OffsetDateTime;
};

type BaseTemplateHeader = {
    title: string;
    type: TemplateType;
    readonly: boolean;
    state: TemplateState;
    id: TemplateId;
    createdBy: ChangeStamp;
    modifiedBy: ChangeStamp[];
};

type SearchTemplateHeader = BaseTemplateHeader & { type: TemplateType.Search };
type LocationTemplateHeader = BaseTemplateHeader & { type: TemplateType.Location; marker: string };

type TemplateBase = {
    fields: FormField[];
    forms?: { [key: FormObjectGuid]: FormState };
};

export enum TemplateType {
    Search = "search",
    Location = "location",
}

export type SearchTemplate = TemplateBase & {
    objects: FormObject[];
} & SearchTemplateHeader;

export type LocationTemplate = TemplateBase & LocationTemplateHeader;

export type Template = SearchTemplate | LocationTemplate;

// TODO: Update this type.
export type Form = {
    id: FormId;
    title: string;
    fields: FormField[];
    readonly: boolean;
    state: FormState;
    location?: vec3;
    createdBy: ChangeStamp;
    modifiedBy: ChangeStamp[];
};

export type FormGLtfAsset = {
    name: string;
    title: string;
    baseObjectId: number;
};
