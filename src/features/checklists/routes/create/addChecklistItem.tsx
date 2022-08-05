import { FormEventHandler, useState } from "react";
import {
    Autocomplete,
    Box,
    Button,
    Checkbox,
    Chip,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    Radio,
    RadioGroup,
    Typography,
} from "@mui/material";
import { useHistory } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

import { Divider, ScrollBox, TextField } from "components";
import { useToggle } from "hooks/useToggle";

import { ChecklistItem, ChecklistItemType } from "../../types";

export function AddChecklistItem({ onSave }: { onSave: (item: ChecklistItem) => void }) {
    const history = useHistory();
    const [title, setTitle] = useState("");
    const [type, setType] = useState(ChecklistItemType.Checkbox);
    const [relevant, toggleRelevant] = useToggle(true);
    const [options, setOptions] = useState([] as string[]);

    const canSave =
        title &&
        ([ChecklistItemType.Text, ChecklistItemType.YesNo, ChecklistItemType.TrafficLight].includes(type) ||
            options.length);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        if (!canSave) {
            return;
        }

        onSave({
            id: uuidv4(),
            title,
            type,
            required: relevant,
            ...([ChecklistItemType.Checkbox, ChecklistItemType.Dropdown].includes(type) ? { options } : {}),
        } as ChecklistItem);

        history.goBack();
    };

    return (
        <ScrollBox p={1} pt={2} pb={3} component="form" onSubmit={handleSubmit}>
            <Typography fontWeight={600} mb={1}>
                Checklist item
            </Typography>
            <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth />
            <Divider sx={{ my: 1 }} />
            <FormGroup>
                <FormControlLabel
                    control={<Checkbox size="small" checked={relevant} onChange={() => toggleRelevant()} />}
                    label="Always relevant"
                />
            </FormGroup>
            <Divider sx={{ my: 1 }} />
            <FormControl>
                <FormLabel sx={{ fontWeight: 600, color: "text.primary" }} id="checklist-item-type">
                    Type
                </FormLabel>
                <RadioGroup
                    value={type}
                    onChange={(_e, value) => setType(value as ChecklistItemType)}
                    row
                    aria-labelledby="checklist-item-type"
                    name="checklist-item-types"
                >
                    <FormControlLabel
                        value={ChecklistItemType.Checkbox}
                        control={<Radio size="small" />}
                        label="Checkbox"
                    />
                    <FormControlLabel value={ChecklistItemType.YesNo} control={<Radio size="small" />} label="Yes/No" />
                    <FormControlLabel
                        value={ChecklistItemType.TrafficLight}
                        control={<Radio size="small" />}
                        label="Traffic light"
                    />
                    <FormControlLabel
                        value={ChecklistItemType.Dropdown}
                        control={<Radio size="small" />}
                        label="Dropdown"
                    />
                    <FormControlLabel value={ChecklistItemType.Text} control={<Radio size="small" />} label="Text" />
                </RadioGroup>
            </FormControl>
            {[ChecklistItemType.Checkbox, ChecklistItemType.Dropdown].includes(type) ? (
                <>
                    <Divider sx={{ mb: 2 }} />
                    <Autocomplete
                        multiple
                        size="small"
                        id="type-options"
                        options={[]}
                        value={options}
                        onChange={(_e, value) => setOptions(value as string[])}
                        freeSolo
                        renderTags={(_value, getTagProps) =>
                            options.map((option: string, index: number) => (
                                <Chip variant="outlined" label={option} {...getTagProps({ index })} size="small" />
                            ))
                        }
                        renderInput={(params) => <TextField {...params} label="Options" />}
                    />
                </>
            ) : null}
            <Box display="flex" justifyContent="space-between" mt={2}>
                <Button variant="outlined" color="grey" sx={{ mr: 2 }} fullWidth onClick={() => history.goBack()}>
                    Cancel
                </Button>
                <Button variant="contained" color="primary" fullWidth disabled={!canSave} type="submit">
                    Save item
                </Button>
            </Box>
        </ScrollBox>
    );
}
