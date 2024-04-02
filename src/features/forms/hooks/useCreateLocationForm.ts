import { ReadonlyVec3 } from "gl-matrix";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import { useSceneId } from "hooks/useSceneId";

import { useCreateLocationFormMutation } from "../api";
import { formsActions, selectCurrentFormsList } from "../slice";
import { useFetchAssetList } from "./useFetchAssetList";

export function useCreateLocationForm() {
    useFetchAssetList();

    const templateId = useAppSelector(selectCurrentFormsList);
    const dispatch = useAppDispatch();

    const sceneId = useSceneId();
    const [createForm] = useCreateLocationFormMutation();

    return useCallback(
        ({ location }: { location: ReadonlyVec3 }) => {
            createLocationForm();

            async function createLocationForm() {
                if (!templateId) {
                    return;
                }

                const id = await createForm({
                    projectId: sceneId,
                    form: { id: templateId, location },
                }).unwrap();

                // It's not required to add form to the list here, because it would've been added
                // on forms refetch (which is triggered by RTK cache invalidation) anyway
                // but here we can do it slightly sooner
                dispatch(
                    formsActions.addLocationForms([
                        {
                            templateId: templateId,
                            id,
                            state: "new",
                            location,
                        },
                    ])
                );

                dispatch(formsActions.setSelectedFormId(id));
            }
        },
        [dispatch, templateId, sceneId, createForm]
    );
}
