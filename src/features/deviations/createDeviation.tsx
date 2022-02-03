import { FormEvent, useState } from "react";
import { TextField } from "@mui/material";

import { Confirmation } from "components";
import { useAppDispatch, useAppSelector } from "app/store";

import { DeviationsStatus, selectDeviationsStatus, deviationsActions, selectDeviations } from "./deviationsSlice";

export function CreateDeviation() {
    const status = useAppSelector(selectDeviationsStatus);
    const deviations = useAppSelector(selectDeviations);
    const dispatch = useAppDispatch();

    const editing = status.status === DeviationsStatus.Editing ? deviations.colors[status.idx] : undefined;

    const [deviationNumber, setDeviationNumber] = useState(editing ? String(editing.deviation) : "");
    const [error, setError] = useState("");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (
            deviations.colors.some(
                (deviation) => deviation.deviation === Number(deviationNumber) && deviation !== editing
            )
        ) {
            setError("A deviation with this value is already set.");
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
        dispatch(deviationsActions.setStatus({ status: DeviationsStatus.Initial }));
    };

    return (
        <Confirmation
            title={editing ? "Edit deviation" : "Add deviation"}
            confirmBtnText="Save"
            onCancel={() => {
                dispatch(deviationsActions.setStatus({ status: DeviationsStatus.Initial }));
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
