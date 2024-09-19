import { type quat, type vec3 } from "gl-matrix";

export enum FormItemType {
    Checkbox = "checkbox",
    YesNo = "yesNo",
    TrafficLight = "trafficLight",
    Dropdown = "dropdown",
    Input = "input",
    Text = "text",
    File = "file",
    DateTime = "dateTime",
    Date = "date",
    Time = "time",
}

export type FormItem = SimpleItem | ItemWithOptions | FileItem | DateTimeItem;

export type FormFileUploadResponse = { checksum?: string; url?: string };

export type FormsFile = File & FormFileUploadResponse;

type BaseItem<T extends Date | string[] | FormsFile[] | null> = {
    id?: string;
    title: string;
    required: boolean;
    value?: T;
    relevant?: boolean;
};

type SimpleItem = BaseItem<string[] | null> & {
    type: Exclude<
        FormItemType,
        | FormItemType.Dropdown
        | FormItemType.Checkbox
        | FormItemType.File
        | FormItemType.Date
        | FormItemType.Time
        | FormItemType.DateTime
    >;
};

interface ItemWithOptions extends BaseItem<string[] | null> {
    type: Exclude<
        FormItemType,
        | FormItemType.Input
        | FormItemType.Text
        | FormItemType.File
        | FormItemType.Date
        | FormItemType.Time
        | FormItemType.DateTime
    >;
    options: string[];
}

interface ItemWithOptions extends BaseItem<string[] | null> {
    type: Exclude<
        FormItemType,
        | FormItemType.Input
        | FormItemType.Text
        | FormItemType.File
        | FormItemType.Date
        | FormItemType.Time
        | FormItemType.DateTime
    >;
    options: string[];
}

export interface FileItem extends BaseItem<FormsFile[]> {
    type: FormItemType.File;
    defaultValue?: FormsFile[];
    accept: string;
    multiple: boolean;
    readonly: boolean;
    directory?: boolean;
}

export interface DateTimeItem extends BaseItem<Date> {
    type: FormItemType.Date | FormItemType.Time | FormItemType.DateTime;
    readonly?: boolean;
    defaultValue?: Date;
    min?: Date;
    max?: Date;
    step?: number;
}

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
    | {
          type: FormItemType.Date | FormItemType.Time | FormItemType.DateTime;
          id?: string;
          label?: string;
          value?: string;
          defaultValue?: string;
          required?: boolean;
          readonly?: boolean;
          min?: string;
          max?: string;
          step?: number;
      }
    | {
          type: "file";
          id?: string;
          value?: FormsFile[];
          defaultValue?: FormsFile[];
          label?: string;
          required?: boolean;
          readonly?: boolean;
          accept?: string;
          multiple?: boolean;
          directory?: boolean;
      };

export type FormObjectGuid = string;

export type FormObject = {
    id: number;
    guid: FormObjectGuid;
    position: vec3;
    name?: string;
};

type ChangeStamp = {
    userName?: string;
    userLogin?: string;
    timestamp?: OffsetDateTime;
};

type BaseTemplateHeader = {
    title: string;
    type: TemplateType;
    readonly: boolean;
    state: TemplateState;
    id: TemplateId;
    createdBy?: ChangeStamp;
};

type SearchTemplateHeader = BaseTemplateHeader & { type: TemplateType.Search };
type LocationTemplateHeader = BaseTemplateHeader & { type: TemplateType.Location; marker: string };

export type FormRecord = {
    title?: string;
    state: FormState;
    location?: vec3;
    rotation?: quat;
    scale?: number;
};

export type FormInstanceId = string;

type TemplateBase = {
    fields: FormField[];
};

export enum TemplateType {
    // TODO: Deprecate this old types.
    Search = "search",
    Location = "location",
    //

    Object = "object",
    Geo = "geo",
}

export type SearchTemplate = TemplateBase & {
    objects: FormObject[];
    searchPattern: string;
    forms?: { [key: FormObjectGuid]: FormRecord };
} & SearchTemplateHeader;

export type LocationTemplate = TemplateBase & {
    forms?: { [key: FormInstanceId]: FormRecord };
} & LocationTemplateHeader;

export type Template = SearchTemplate | LocationTemplate;

export type MinimalTemplate = {
    id: TemplateId;
    type: TemplateType;
    title: string;

    // state-based counters for the form instances,
    // computed from indexes on the backend
    forms: {
        finished: number;
        total: number;
    };
};

export type Signature = ChangeStamp & { isFinal: boolean };

export type Form = {
    id: FormId;
    title: string;
    fields: FormField[];
    readonly: boolean;
    state: FormState;
    location?: vec3;
    rotation?: quat;
    scale?: number;
    createdBy?: ChangeStamp;
    signatures?: Signature[];
    isFinal?: boolean;
};

export type FormGLtfAsset = {
    name: string;
    label: string;
    matIconName: string;
    icon: string;
    baseObjectId: number;
};

export type FormTransform = {
    // Reason for having templateId/formId here:
    // When we click another marker - selectedFormId changes straight away, but not transformDraft,
    // because saving relies on it.
    // Meanwhile new selected object is rendered with the previous object transform causing flicker.
    // By attaching transformDraft to particular form we can avoid that flicker.
    // Another alternative could be to make it a state in locationInstance, but I want to localize
    // form transformDraft as much as possible because it might update quite rabpidly.
    templateId: string;
    formId: string;
    location: vec3;
    rotation?: quat;
    scale?: number;
    updated: boolean;
};
