import { TextField } from "@mui/material";
import { FormEvent, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Confirmation } from "components";
import { selectProjectIsV2 } from "slices/explorer";

import { deviationsActions } from "../deviationsSlice";
import { selectDeviationForm, selectSelectedProfile } from "../selectors";
import { updateFormField } from "../validation";

export function CrupdateColorStop() {
    const isProjectV2 = useAppSelector(selectProjectIsV2);
    const history = useHistory();
    const { idx: _idx } = useParams<{ idx?: string }>();
    const idx = _idx ? Number(_idx) : undefined;
    const deviationForm = useAppSelector(selectDeviationForm);
    const selectedProfile = useAppSelector(selectSelectedProfile);
    const absoluteValues = deviationForm?.colorSetup.absoluteValues ?? selectedProfile!.colors.absoluteValues;
    const colorStops = deviationForm?.colorSetup.colorStops.value || selectedProfile!.colors.colorStops;
    const dispatch = useAppDispatch();

    const editing = idx !== undefined ? colorStops[idx] : undefined;
    const [deviationNumber, setDeviationNumber] = useState(editing ? String(editing.position) : "");
    const [error, setError] = useState("");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        const alreadyExists = absoluteValues
            ? colorStops.some(
                  (deviation) =>
                      Math.abs(Math.abs(deviation.position) - Math.abs(Number(deviationNumber))) < 0.01 &&
                      deviation !== editing
              )
            : colorStops.some((deviation) => deviation.position === Number(deviationNumber) && deviation !== editing);

        if (alreadyExists) {
            setError("A deviation with this value already exists.");
            return;
        }

        const newColorStops = editing
            ? colorStops.map((deviation) =>
                  deviation === editing ? { ...editing, position: Number(deviationNumber) } : deviation
              )
            : colorStops.concat({ position: Number(deviationNumber), color: [1, 0, 0, 1] });

        newColorStops.sort((s1, s2) => s2.position - s1.position);

        if (deviationForm) {
            dispatch(
                deviationsActions.setDeviationForm({
                    ...deviationForm,
                    colorSetup: {
                        ...deviationForm.colorSetup,
                        colorStops: updateFormField(newColorStops),
                    },
                })
            );
        } else {
            dispatch(
                deviationsActions.setProfile({
                    id: selectedProfile!.id!,
                    profile: {
                        ...selectedProfile!,
                        colors: { absoluteValues: selectedProfile!.colors!.absoluteValues, colorStops: newColorStops },
                    },
                    setColorsForAll: !isProjectV2,
                })
            );
        }

        history.goBack();
    };

    return (
        <Confirmation
            title={editing ? "Edit deviation" : "Add deviation"}
            confirmBtnText="Save"
            onCancel={() => {
                history.goBack();
            }}
            component="form"
            onSubmit={handleSubmit}
        >
            <TextField
                required
                fullWidth
                error={Boolean(error)}
                helperText={error || " "}
                label="Deviation"
                inputProps={{ type: "number", step: 0.01 }}
                autoFocus
                value={deviationNumber}
                onChange={(e) => {
                    setError("");
                    setDeviationNumber(e.target.value);
                }}
                sx={{ mb: 2 }}
            />
        </Confirmation>
    );
}
