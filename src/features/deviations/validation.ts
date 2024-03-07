import { DeviationForm, FormField } from "./deviationTypes";

export function validateDeviationForm(deviationForm: DeviationForm, otherNames: string[]) {
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
        groups1: makeError({
            error: deviationForm.groups1.value.length === 0 ? "Select groups" : undefined,
            active: deviationForm.groups1.edited,
        }),
        groups2: makeError({
            error: deviationForm.groups2.value.length === 0 ? "Select groups" : undefined,
            active: deviationForm.groups2.edited,
        }),
        colorStops: makeError({
            error:
                deviationForm.colorSetup.colorStops.value.length === 0 ? "Define at least one color stop" : undefined,
            active: deviationForm.colorSetup.colorStops.edited,
        }),
    };
}

function makeError({ active, error }: { active: boolean | undefined; error: string | undefined }): FieldError {
    return { active: Boolean(active && error), error };
}

export type FieldError = {
    error?: string;
    active?: boolean;
};

export type DeviationFormErrors = ReturnType<typeof validateDeviationForm>;

export function hasErrors(errors: DeviationFormErrors) {
    return Object.values(errors).some((e) => e.error);
}

export function hasActiveErrors(errors: DeviationFormErrors) {
    return Object.values(errors).some((e) => e.error && e.active);
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
