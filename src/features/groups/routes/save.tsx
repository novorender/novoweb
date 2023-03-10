import { FormEvent } from "react";
import { Box, Checkbox, FormControlLabel, useTheme } from "@mui/material";
import { useHistory } from "react-router-dom";
import { SceneData } from "@novorender/data-js-api";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { isInternalGroup, useLazyObjectGroups } from "contexts/objectGroups";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useToggle } from "hooks/useToggle";
import { Confirmation } from "components";
import { groupsActions, selectSaveStatus } from "features/groups/groupsSlice";
import { AsyncStatus } from "types/misc";

export function Save({ sceneId }: { sceneId: string }) {
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const objectGroups = useLazyObjectGroups();
    const [saveState, toggleSaveState] = useToggle();
    const status = useAppSelector(selectSaveStatus);

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();

        dispatch(groupsActions.setSaveStatus(AsyncStatus.Loading));

        try {
            const {
                url: _url,
                objectGroups: originalGroups,
                ...originalScene
            } = (await dataApi.loadScene(sceneId)) as SceneData;

            let updated = originalGroups
                .filter((group) => !group.id)
                .concat(objectGroups.current.filter((grp) => !isInternalGroup(grp)));

            if (!saveState) {
                updated = updated
                    .map((group) => {
                        const originalGroup = originalGroups.find((grp) => grp.id === group.id);

                        return {
                            ...group,
                            selected: originalGroup?.selected ?? false,
                            hidden: originalGroup?.hidden ?? false,
                            opacity: originalGroup?.opacity ?? 0,
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
                url: `${sceneId}:${scene.id}`,
                objectGroups: updated,
            });

            dispatch(groupsActions.setSaveStatus(AsyncStatus.Success));
        } catch {
            dispatch(groupsActions.setSaveStatus(AsyncStatus.Error));
        }

        history.push("/");
    };

    return (
        <>
            <Box
                boxShadow={theme.customShadows.widgetHeader}
                sx={{ height: 5, width: 1, mt: "-5px" }}
                position="absolute"
            />
            <Confirmation
                title="Save groups"
                confirmBtnText="Save"
                onCancel={() => history.goBack()}
                component="form"
                onSubmit={handleSave}
                loading={status === AsyncStatus.Loading}
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
        </>
    );
}
