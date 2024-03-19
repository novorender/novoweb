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
import { FormEventHandler, useCallback, useMemo, useState } from "react";
import { useHistory } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";

import { Divider, ScrollBox, TextArea, TextField } from "components";
import { useToggle } from "hooks/useToggle";

import { FormItem, FormItemType } from "../../types";

export function AddFormItem({ onSave }: { onSave: (item: FormItem) => void }) {
    const history = useHistory();
    const [title, setTitle] = useState("");
    const [value, setValue] = useState("");
    const [type, setType] = useState(FormItemType.Checkbox);
    const [relevant, toggleRelevant] = useToggle(true);
    const [options, setOptions] = useState([] as string[]);

    const canSave = useMemo(
        () =>
            title.trim() &&
            ([FormItemType.Input, FormItemType.YesNo, FormItemType.TrafficLight].includes(type) ||
                ([FormItemType.Checkbox, FormItemType.Dropdown].includes(type) && options.length) ||
                (type === FormItemType.Text && value.trim().length)),
        [title, type, options, value]
    );

    const handleSubmit = useCallback<FormEventHandler>(
        (e) => {
            e.preventDefault();

            if (!canSave) {
                return;
            }

            const newItem: FormItem = {
                id: uuidv4(),
                title,
                type,
                value: type === FormItemType.Text ? [value] : undefined,
                required: type !== FormItemType.Text && relevant,
                ...(type === FormItemType.Checkbox || type === FormItemType.Dropdown ? { options } : {}),
            } as FormItem;

            onSave(newItem);
            history.goBack();
        },
        [canSave, title, type, relevant, options, onSave, history, value]
    );

    const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value), []);
    const handleToggleRelevant = useCallback(
        (_: React.ChangeEvent<HTMLInputElement>) => toggleRelevant(),
        [toggleRelevant]
    );
    const handleTypeChange = useCallback(
        (_: React.ChangeEvent<HTMLInputElement>, value: string) => setType(value as FormItemType),
        []
    );
    const handleOptionsChange = useCallback((_: React.SyntheticEvent, value: string[]) => setOptions(value), []);
    const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => setValue(e.target.value), []);

    return (
        <ScrollBox p={1} pt={2} pb={3} component="form" onSubmit={handleSubmit}>
            <Typography fontWeight={600} mb={1}>
                form item
            </Typography>
            <TextField label="Title" value={title} onChange={handleTitleChange} fullWidth />
            <Divider sx={{ my: 1 }} />
            <FormGroup>
                <FormControlLabel
                    control={
                        <Checkbox
                            size="small"
                            checked={type !== FormItemType.Text && relevant}
                            disabled={type === FormItemType.Text}
                            onChange={handleToggleRelevant}
                        />
                    }
                    label="Always relevant"
                />
            </FormGroup>
            <Divider sx={{ my: 1 }} />
            <FormControl>
                <FormLabel sx={{ fontWeight: 600, color: "text.primary" }} id="form-item-type">
                    Type
                </FormLabel>
                <RadioGroup
                    value={type}
                    onChange={handleTypeChange}
                    row
                    aria-labelledby="form-item-type"
                    name="form-item-types"
                >
                    <FormControlLabel value={FormItemType.Checkbox} control={<Radio size="small" />} label="Checkbox" />
                    <FormControlLabel value={FormItemType.YesNo} control={<Radio size="small" />} label="Yes/No" />
                    <FormControlLabel
                        value={FormItemType.TrafficLight}
                        control={<Radio size="small" />}
                        label="Traffic light"
                    />
                    <FormControlLabel value={FormItemType.Dropdown} control={<Radio size="small" />} label="Dropdown" />
                    <FormControlLabel value={FormItemType.Input} control={<Radio size="small" />} label="Input" />
                    <FormControlLabel value={FormItemType.Text} control={<Radio size="small" />} label="Text or URL" />
                </RadioGroup>
            </FormControl>
            {[FormItemType.Checkbox, FormItemType.Dropdown].includes(type) && (
                <>
                    <Divider sx={{ mb: 2 }} />
                    <Autocomplete
                        multiple
                        size="small"
                        id="type-options"
                        options={[]}
                        value={options}
                        onChange={handleOptionsChange}
                        freeSolo
                        renderTags={(_value, getTagProps) =>
                            options.map((option: string, index: number) => (
                                <Chip variant="outlined" label={option} {...getTagProps({ index })} size="small" />
                            ))
                        }
                        renderInput={(params) => <TextField {...params} label="Options" />}
                    />
                </>
            )}
            {type === FormItemType.Text && (
                <>
                    <Divider sx={{ mb: 2 }} />
                    <TextArea
                        minRows={3}
                        placeholder="Additional information or URL"
                        style={{ width: "100%" }}
                        value={value}
                        onChange={handleTextChange}
                    />
                </>
            )}
            <Box display="flex" justifyContent="space-between" mt={2}>
                <Button variant="outlined" color="grey" sx={{ mr: 2 }} fullWidth onClick={history.goBack}>
                    Cancel
                </Button>
                <Button variant="contained" color="primary" fullWidth disabled={!canSave} type="submit">
                    Save item
                </Button>
            </Box>
        </ScrollBox>
    );
}
