import { FormEvent } from "react";
import { SceneData } from "@novorender/data-js-api";
import { Box, Checkbox, FormControlLabel } from "@mui/material";

import { dataApi } from "app";
import { Confirmation } from "components";

import { useAppDispatch, useAppSelector } from "app/store";
import { selectEditingScene } from "slices/renderSlice";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useCustomGroups } from "contexts/customGroups";

import { useToggle } from "hooks/useToggle";
import { useSceneId } from "hooks/useSceneId";

import { groupsActions, GroupsStatus } from "./groupsSlice";

export function ConfirmSave() {
    const editingScene = useAppSelector(selectEditingScene);
    const dispatch = useAppDispatch();
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const { state: customGroups } = useCustomGroups();
    const sceneId = useSceneId();
    const [saveState, toggleSaveState] = useToggle();

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();

        const id = editingScene && editingScene.id ? editingScene.id : sceneId;
        dispatch(groupsActions.setStatus(GroupsStatus.Saving));

        try {
            const {
                url: _url,
                objectGroups: originalGroups,
                ...originalScene
            } = (await dataApi.loadScene(id)) as SceneData;

            let updated = originalGroups.filter((group) => !group.id).concat(customGroups);

            if (!saveState) {
                updated = updated
                    .map((group) => {
                        const originalGroup = originalGroups.find((grp) => grp.id === group.id);

                        return {
                            ...group,
                            selected: originalGroup ? originalGroup.selected : false,
                            hidden: originalGroup ? originalGroup.hidden : false,
                        };
                    })
                    .sort(
                        (a, b) =>
                            originalGroups.findIndex((grp) => grp.id === a.id) -
                            originalGroups.findIndex((grp) => grp.id === b.id)
                    );
            }

            await dataApi.putScene({
                ...originalScene,
                url: `${id}:${scene.id}`,
                objectGroups: updated,
            });

            dispatch(groupsActions.setStatus(GroupsStatus.Initial));
        } catch {
            dispatch(groupsActions.setStatus(GroupsStatus.Error));
        }
    };

    return (
        <Confirmation
            title="Save groups"
            confirmBtnText="Save"
            onCancel={() => dispatch(groupsActions.setStatus(GroupsStatus.Unsaved))}
            component="form"
            onSubmit={handleSave}
        >
            <FormControlLabel
                control={<Checkbox size="small" color="primary" checked={saveState} onChange={toggleSaveState} />}
                label={
                    <Box mr={0.5} sx={{ userSelect: "none" }}>
                        Include highlight / visibility changes
                    </Box>
                }
                sx={{ mb: 3 }}
            />
        </Confirmation>
    );
}
