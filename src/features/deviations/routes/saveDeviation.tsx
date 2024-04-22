import { Box, Checkbox, FormControlLabel, FormHelperText } from "@mui/material";
import { useState } from "react";
import { useHistory } from "react-router-dom";

import { useAppSelector } from "app/redux-store-interactions";
import { Confirmation } from "components";
import { AsyncStatus } from "types/misc";

import { selectSaveStatus } from "../deviationsSlice";
import { useCalcDeviations } from "../hooks/useCalcDeviations";
import { useMergeFormAndSave } from "../hooks/useMergeFormAndSave";

export function SaveDeviation() {
    const history = useHistory();
    const mergeFormAndSave = useMergeFormAndSave();
    const calcDeviations = useCalcDeviations();
    const saveStatus = useAppSelector(selectSaveStatus);

    const [recalc, setRecalc] = useState(true);

    const handleSave = () => {
        save();

        async function save() {
            const uiConfig = await mergeFormAndSave();
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
                        You can recalculate later if you plan to update other deviation profiles now
                    </FormHelperText>
                </Box>
            </Confirmation>
        </>
    );
}
