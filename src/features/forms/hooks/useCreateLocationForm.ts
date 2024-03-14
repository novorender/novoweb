import { ReadonlyVec3 } from "gl-matrix";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/store";

import { formsActions, selectCurrentFormsList, selectLocationForms } from "../slice";
import { useFetchAssetList } from "./useFetchAssetList";

export function useCreateLocationForm() {
    useFetchAssetList();

    const currentForms = useAppSelector(selectLocationForms);
    const templateId = useAppSelector(selectCurrentFormsList);
    const dispatch = useAppDispatch();

    return useCallback(
        ({ location }: { location: ReadonlyVec3 }) => {
            createLocationForm();

            async function createLocationForm() {
                if (!templateId) {
                    return;
                }

                dispatch(
                    formsActions.setLocationForms([
                        ...currentForms,
                        {
                            form: {
                                id: window.crypto.randomUUID(),
                                state: "new",
                                location,
                            },
                            templateId: templateId,
                        },
                    ])
                );
            }
        },
        [dispatch, currentForms, templateId]
    );
}
