import { FormEvent, useState } from "react";
import { TextField } from "@mui/material";
import { useHistory, useParams } from "react-router-dom";

import { Confirmation } from "components";
import { useAppDispatch, useAppSelector } from "app/store";

import { deviationsActions, selectDeviations } from "../deviationsSlice";

export function CrupdateColorStop() {
    const history = useHistory();
    let { idx: _idx } = useParams<{ idx?: string }>();
    const idx = _idx ? Number(_idx) : undefined;
    const deviations = useAppSelector(selectDeviations);
    const dispatch = useAppDispatch();

    const editing = idx !== undefined ? deviations.colors[idx] : undefined;
    const [deviationNumber, setDeviationNumber] = useState(editing ? String(editing.deviation) : "");
    const [error, setError] = useState("");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (
            deviations.colors.some(
                (deviation) => deviation.deviation === Number(deviationNumber) && deviation !== editing
            )
        ) {
            setError("A deviation with this value already exists.");
            return;
        }

        const newDeviations = editing
            ? deviations.colors.map((deviation) =>
                  deviation === editing ? { ...editing, deviation: Number(deviationNumber) } : deviation
              )
            : deviations.colors.concat({ deviation: Number(deviationNumber), color: [1, 0, 0, 1] });

        dispatch(
            deviationsActions.setDeviations({
                colors: [...newDeviations].sort((a, b) => b.deviation - a.deviation),
            })
        );

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
