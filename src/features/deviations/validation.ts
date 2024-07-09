import { ColorStop } from "apis/dataV2/deviationTypes";
import { ObjectGroup } from "contexts/objectGroups";

import { DeviationForm, FormField } from "./deviationTypes";

export function validateDeviationForm(deviationForm: DeviationForm, otherNames: string[], objectGroups: ObjectGroup[]) {
    const deletedGroupsMessage = "Some groups were deleted, please unselect them";

    return {
        name: makeError({
            error:
                deviationForm.name.value.length === 0
                    ? "Enter name"
                    : otherNames.includes(deviationForm.name.value.toLowerCase())
                    ? "The name is already taken, enter another name"
                    : undefined,
            active: deviationForm.name.edited,
        }),
        colorStops: makeError({
            error:
                deviationForm.colorSetup.colorStops.value.length === 0
                    ? "Define at least one color stop"
                    : deviationForm.colorSetup.absoluteValues &&
                      !hasUniqueAbsColorStops(deviationForm.colorSetup.colorStops.value)
                    ? "Color stop absolute values have to be unique when Absolute Values is checked"
                    : undefined,
            active: deviationForm.colorSetup.colorStops.edited,
        }),
        subprofiles: deviationForm.subprofiles.map((sp) => ({
            groups1: makeError({
                error:
                    sp.groups1.value.length === 0
                        ? "Select groups"
                        : sp.groups1.value.some((id) => !objectGroups.some((g) => g.id === id))
                        ? deletedGroupsMessage
                        : undefined,
                active: sp.groups1.edited,
            }),
            groups2: makeError({
                error:
                    sp.groups2.value.length === 0
                        ? "Select groups"
                        : sp.groups2.value.some((id) => !objectGroups.some((g) => g.id === id))
                        ? deletedGroupsMessage
                        : undefined,
                active: sp.groups2.edited,
            }),
            favorites: makeError({
                error: sp.favorites.value.some((id) => !objectGroups.some((g) => g.id === id))
                    ? deletedGroupsMessage
                    : undefined,
                active: sp.favorites.edited,
            }),
            heightToCeiling: makeError({
                error:
                    sp.tunnelInfo.heightToCeiling.value && Number.isNaN(Number(sp.tunnelInfo.heightToCeiling.value))
                        ? "Number is invalid"
                        : Number(sp.tunnelInfo.heightToCeiling.value) < 0
                        ? "Number can't be negative"
                        : undefined,
                active: sp.centerLine.enabled && sp.tunnelInfo.enabled && sp.tunnelInfo.heightToCeiling.edited,
            }),
        })),
    };
}

function hasUniqueAbsColorStops(colorStops: ColorStop[]) {
    return new Set(colorStops.map((cs) => Math.abs(cs.position).toFixed(3))).size === colorStops.length;
}

function makeError({ active, error }: { active: boolean | undefined; error: string | undefined }): FieldError {
    return { active: Boolean(active && error), error };
}

export type FieldError = {
    error?: string;
    active?: boolean;
};

export type DeviationFormErrors = ReturnType<typeof validateDeviationForm>;
export type SubprofileGroupErrors = DeviationFormErrors["subprofiles"][0];

type ErrorContainer = { [key: string]: FieldError | ErrorContainer[] };

function someError(errors: ErrorContainer, fn: (e: FieldError) => boolean): boolean {
    return Object.values(errors).some((value) => {
        if (Array.isArray(value)) {
            return value.some((e) => someError(e, fn));
        } else {
            return fn(value);
        }
    });
}

export function hasErrors(errors: DeviationFormErrors) {
    return someError(errors, (e) => Boolean(e.error));
}

export function hasActiveErrors(errors: DeviationFormErrors) {
    return someError(errors, (e) => Boolean(e.error && e.active));
}

export function updateFormField<T>(value: T): FormField<T> {
    return {
        value,
        edited: true,
    };
}

export function touchFormField<T>(field: FormField<T>): FormField<T> {
    return { value: field.value, edited: true };
}

export function isActiveError(error: FieldError) {
    return Boolean(error.active && error.error);
}

export function getActiveErrorText(error: FieldError) {
    return error.active ? error.error : "";
}
