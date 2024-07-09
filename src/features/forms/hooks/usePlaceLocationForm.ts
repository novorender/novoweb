import { ReadonlyVec3 } from "gl-matrix";
import { useCallback } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { ObjectVisibility, Picker, renderActions } from "features/render";
import { useSceneId } from "hooks/useSceneId";

import { useCreateLocationFormMutation } from "../api";
import { formsGlobalsActions } from "../formsGlobals";
import { useDispatchFormsGlobals } from "../formsGlobals/hooks";
import { formsActions, selectCurrentFormsList, selectSelectedFormId } from "../slice";
import { useFetchAssetList } from "./useFetchAssetList";

export function usePlaceLocationForm() {
    useFetchAssetList();

    const templateId = useAppSelector(selectCurrentFormsList);
    const selectedFormId = useAppSelector(selectSelectedFormId);
    const dispatchFormsGlobals = useDispatchFormsGlobals();
    const dispatch = useAppDispatch();

    const sceneId = useSceneId();
    const [createForm] = useCreateLocationFormMutation();

    return useCallback(
        ({ location }: { location: ReadonlyVec3 }) => {
            placeLocationForm();

            async function placeLocationForm() {
                if (!templateId) {
                    return;
                }

                // If a form is currently selected - move it,
                // otherwise create a new form
                if (selectedFormId) {
                    dispatchFormsGlobals(formsGlobalsActions.setTransformDraftLocation(location));
                    dispatch(renderActions.stopPicker(Picker.FormLocation));
                    dispatch(renderActions.setDefaultVisibility(ObjectVisibility.SemiTransparent));
                } else {
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
            }
        },
        [dispatch, templateId, sceneId, selectedFormId, createForm, dispatchFormsGlobals]
    );
}
