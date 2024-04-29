import { Box, Checkbox, FormControlLabel, FormHelperText } from "@mui/material";
import { useState } from "react";
import { useHistory, useLocation } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation } from "components";
import { selectDeviations } from "features/render";
import { AsyncStatus } from "types/misc";

import { deviationsActions } from "../deviationsSlice";
import { UiDeviationConfig } from "../deviationTypes";
import { useCalcDeviations } from "../hooks/useCalcDeviations";
import { useSaveDeviationConfig } from "../hooks/useSaveDeviationConfig";
import { selectDeviationProfiles, selectSaveStatus } from "../selectors";

export function DeleteDeviation() {
    const history = useHistory();
    const { id } = useLocation<{ id: string }>().state;
    const dispatch = useAppDispatch();
    const profiles = useAppSelector(selectDeviationProfiles);
    const saveConfig = useSaveDeviationConfig();
    const deviations = useAppSelector(selectDeviations);
    const calcDeviations = useCalcDeviations();
    const saveStatus = useAppSelector(selectSaveStatus);

    const [recalc, setRecalc] = useState(true);

    const handleRemove = () => {
        remove();

        async function remove() {
            if (profiles.status !== AsyncStatus.Success) {
                return;
            }

            const newProfileData: UiDeviationConfig = {
                ...profiles.data,
                profiles: profiles.data.profiles.filter((p) => p.id !== id),
                rebuildRequired: !recalc,
            };

            await saveConfig({
                uiConfig: newProfileData,
                deviations,
                showRebuildMessage: false,
            });

            if (newProfileData && recalc) {
                await calcDeviations(newProfileData);
            }

            dispatch(deviationsActions.setProfiles({ status: AsyncStatus.Success, data: newProfileData }));
            history.goBack();
        }
    };

    return (
        <>
            <Confirmation
                title="Remove deviation profile?"
                confirmBtnText="Remove"
                onCancel={() => {
                    history.goBack();
                }}
                onConfirm={handleRemove}
                loading={saveStatus.status === AsyncStatus.Loading}
            >
                <FormControlLabel
                    control={<Checkbox checked={recalc} onChange={(e) => setRecalc(e.target.checked)} />}
                    label="Recalculate deviations?"
                    disabled={saveStatus.status === AsyncStatus.Loading}
                />
                <Box mb={4}>
                    <FormHelperText>
                        You can recalculate later if you plan to update other deviation profiles now
                    </FormHelperText>
                </Box>
            </Confirmation>
        </>
    );
}
