import { TextField } from "@mui/material";
import { FormEvent, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Confirmation } from "components";
import { renderActions, selectDeviations } from "features/render";

export function CrupdateColorStop() {
    const history = useHistory();
    let { idx: _idx } = useParams<{ idx?: string }>();
    const idx = _idx ? Number(_idx) : undefined;
    const deviations = useAppSelector(selectDeviations);
    const dispatch = useAppDispatch();

    const editing = idx !== undefined ? deviations.colorGradient.knots[idx] : undefined;
    const [deviationNumber, setDeviationNumber] = useState(editing ? String(editing.position) : "");
    const [error, setError] = useState("");

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();

        if (
            deviations.colorGradient.knots.some(
                (deviation) => deviation.position === Number(deviationNumber) && deviation !== editing
            )
        ) {
            setError("A deviation with this value already exists.");
            return;
        }

        const knots = editing
            ? deviations.colorGradient.knots.map((deviation) =>
                  deviation === editing ? { ...editing, position: Number(deviationNumber) } : deviation
              )
            : deviations.colorGradient.knots.concat({ position: Number(deviationNumber), color: [1, 0, 0, 1] });

        dispatch(
            renderActions.setPoints({
                deviation: {
                    colorGradient: {
                        knots,
                    },
                },
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
