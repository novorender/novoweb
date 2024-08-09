import { Box, Checkbox, FormControlLabel, FormHelperText } from "@mui/material";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppSelector } from "app/redux-store-interactions";
import { Confirmation } from "components";
import { AsyncStatus } from "types/misc";

import { useCalcDeviations } from "../hooks/useCalcDeviations";
import { useMergeFormAndSave } from "../hooks/useMergeFormAndSave";
import { selectSaveStatus } from "../selectors";

export function SaveDeviation() {
    const { t } = useTranslation();
    const history = useHistory();
    const mergeFormAndSave = useMergeFormAndSave();
    const calcDeviations = useCalcDeviations();
    const saveStatus = useAppSelector(selectSaveStatus);

    const [recalc, setRecalc] = useState(true);

    const handleSave = () => {
        save();

        async function save() {
            // If we recalculate immediately - set rebuild required to false
            const uiConfig = await mergeFormAndSave({ clearRebuildRequired: recalc });
            if (uiConfig && recalc) {
                await calcDeviations(uiConfig);
            }
            history.push("/");
        }
    };

    return (
        <>
            <Confirmation
                title="Save deviation profile?"
                confirmBtnText="Save"
                onCancel={() => {
                    history.goBack();
                }}
                onConfirm={handleSave}
                loading={saveStatus.status === AsyncStatus.Loading}
            >
                <FormControlLabel
                    control={<Checkbox checked={recalc} onChange={(e) => setRecalc(e.target.checked)} />}
                    label="Recalculate deviations?"
                    disabled={saveStatus.status === AsyncStatus.Loading}
                />
                <Box mb={4}>
                    <FormHelperText>
                        {t("youCanRecalculateLaterIfYouPlanToUpdateOtherDeviationProfilesNow")}
                    </FormHelperText>
                </Box>
            </Confirmation>
        </>
    );
}
