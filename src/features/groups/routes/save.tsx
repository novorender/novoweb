import { Box, Checkbox, FormControlLabel, useTheme } from "@mui/material";
import { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useSaveGroupsMutation } from "apis/dataV2/dataV2Api";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { GroupStatus, isInternalGroup, useLazyObjectGroups } from "contexts/objectGroups";
import { groupsActions, selectSaveStatus } from "features/groups/groupsSlice";
import { loadScene } from "features/render/utils";
import { useToggle } from "hooks/useToggle";
import { AsyncStatus } from "types/misc";

export function Save({ sceneId }: { sceneId: string }) {
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();
    const {
        state: { scene },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();
    const objectGroups = useLazyObjectGroups();
    const [saveState, toggleSaveState] = useToggle();
    const status = useAppSelector(selectSaveStatus);
    const [saveGroups] = useSaveGroupsMutation();

    const handleSave = async (e: FormEvent) => {
        e.preventDefault();

        dispatch(groupsActions.setSaveStatus(AsyncStatus.Loading));

        try {
            const [{ objectGroups: originalGroups, ...originalScene }] = await loadScene(sceneId);

            let updated = objectGroups.current
                .filter((grp) => !isInternalGroup(grp))
                .map(({ status, ...grp }) => ({
                    ...grp,
                    selected: status === GroupStatus.Selected,
                    hidden: status === GroupStatus.Hidden,
                    frozen: status === GroupStatus.Frozen,
                    ids: grp.ids ? Array.from(grp.ids) : undefined,
                }));

            if (!saveState) {
                updated = updated
                    .map((group) => {
                        const originalGroup = originalGroups.find((grp) => grp.id === group.id);

                        return {
                            ...group,
                            selected: originalGroup?.selected ?? false,
                            hidden: originalGroup?.hidden ?? false,
                        };
                    })
                    .sort(
                        (a, b) =>
                            originalGroups.findIndex((grp) => grp.id === a.id) -
                            originalGroups.findIndex((grp) => grp.id === b.id),
                    );
            }

            const success = await saveGroups({
                projectId: sceneId,
                groups: updated,
            });

            console.log({
                ...originalScene,
                url: `${sceneId}:${scene.id}`,
                objectGroups: updated,
            });

            if (!success) {
                throw new Error("An error occurred while saving groups.");
            }

            dispatch(groupsActions.setSaveStatus(AsyncStatus.Success));
        } catch (e) {
            console.warn(e);
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
                    control={
                        <Checkbox
                            size="small"
                            color="primary"
                            checked={saveState}
                            onChange={toggleSaveState as () => void}
                            disabled={status === AsyncStatus.Loading}
                        />
                    }
                    label={
                        <Box mr={0.5} sx={{ userSelect: "none" }}>
                            {t("includeHighlight/VisibilityChanges")}
                        </Box>
                    }
                    sx={{ mb: 3 }}
                />
            </Confirmation>
        </>
    );
}
