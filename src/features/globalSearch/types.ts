import { Bookmark } from "@novorender/data-js-api";
import { HierarcicalObjectReference } from "@novorender/webgl-api";

import { Widget, WidgetKey } from "config/features";
import { ObjectGroup } from "contexts/objectGroups";
import { UiDeviationProfile } from "features/deviations/deviationTypes";

export enum Category {
    Group = "group",
    Bookmark = "bookmark",
    Object = "object",
    Widget = "widget",
    Deviation = "deviation",
    Setting = "setting",
}

export type SearchOption =
    | { id: WidgetKey; label: string; widget: Widget; category: Category.Widget }
    | { id: string; label: string; group: ObjectGroup; category: Category.Group }
    | { id: string; label: string; bookmark: Bookmark; category: Category.Bookmark }
    | { id: string; label: string; profile: UiDeviationProfile; category: Category.Deviation }
    | { id: string; label: string; route: string; accordion?: string; field: string; category: Category.Setting }
    | OptionObject;

export type OptionObject = {
    id: string;
    label: string;
    object: HierarcicalObjectReference;
    match?: string;
    searchString?: string;
    category: Category.Object;
};
