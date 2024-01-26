import { NotInterested } from "@mui/icons-material";
import {
    Box,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    IconButton,
    MenuItem,
    OutlinedInput,
    Radio,
    RadioGroup,
    Select,
} from "@mui/material";

import { type ChecklistItem, ChecklistItemType } from "../../types";

const FormItemHeader = ({ item, toggleRelevant }: { item: ChecklistItem; toggleRelevant: () => void }) => (
    <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
        <FormLabel component="legend" sx={{ fontWeight: 600, color: "text.primary" }}>
            {item.title}
        </FormLabel>
        {!item.required && (
            <IconButton size="small" color={item.relevant ? "secondary" : "primary"} onClick={toggleRelevant}>
                <NotInterested fontSize="small" />
            </IconButton>
        )}
    </Box>
);

export function FormItem({
    item,
    setItems,
}: {
    item: ChecklistItem;
    setItems: React.Dispatch<React.SetStateAction<ChecklistItem[]>>;
}) {
    const handleChange = (value: string) =>
        setItems((state) =>
            state.map((_item) =>
                _item === item
                    ? {
                          ...item,
                          value: [value],
                      }
                    : _item
            )
        );

    const toggleRelevant = () => {
        setItems((state) =>
            state.map((_item) =>
                _item === item
                    ? {
                          ...item,
                          relevant: item.required ? true : !item.relevant,
                          value: null,
                      }
                    : _item
            )
        );
    };

    switch (item.type) {
        case ChecklistItemType.Checkbox:
            return (
                <FormControl disabled={!item.required && !item.relevant} component="fieldset" fullWidth>
                    <FormItemHeader item={item} toggleRelevant={toggleRelevant} />
                    <FormGroup row>
                        {item.options.map((option) => (
                            <FormControlLabel
                                key={option}
                                control={
                                    <Checkbox
                                        checked={Boolean(item.value && item.value.includes(option))}
                                        name={option}
                                    />
                                }
                                onChange={(_e, checked) =>
                                    setItems((state) =>
                                        state.map((_item) =>
                                            _item === item
                                                ? {
                                                      ...item,
                                                      value: checked
                                                          ? [...(item.value || []), option]
                                                          : (item.value || []).filter((value) => value !== option),
                                                  }
                                                : _item
                                        )
                                    )
                                }
                                label={option}
                            />
                        ))}
                    </FormGroup>
                </FormControl>
            );

        case ChecklistItemType.YesNo:
            return (
                <FormControl disabled={!item.required && !item.relevant} component="fieldset" fullWidth>
                    <FormItemHeader item={item} toggleRelevant={toggleRelevant} />
                    <RadioGroup
                        value={item.value ? item.value[0] : ""}
                        onChange={(_e, value) => handleChange(value)}
                        row
                        aria-labelledby={item.id}
                        name={item.title}
                    >
                        <FormControlLabel value={"no"} control={<Radio size="small" />} label="No" />
                        <FormControlLabel value={"yes"} control={<Radio size="small" />} label="Yes" />
                    </RadioGroup>
                </FormControl>
            );

        case ChecklistItemType.TrafficLight:
            return (
                <FormControl disabled={!item.required && !item.relevant} component="fieldset" fullWidth>
                    <FormItemHeader item={item} toggleRelevant={toggleRelevant} />
                    <RadioGroup
                        value={item.value ? item.value[0] : ""}
                        onChange={(_e, value) => handleChange(value)}
                        row
                        aria-labelledby={item.id}
                        name={item.title}
                    >
                        <FormControlLabel value={"red"} control={<Radio size="small" />} label="Red" />
                        <FormControlLabel value={"yellow"} control={<Radio size="small" />} label="Yellow" />
                        <FormControlLabel value={"green"} control={<Radio size="small" />} label="Green" />
                    </RadioGroup>
                </FormControl>
            );

        case ChecklistItemType.Dropdown:
            return (
                <FormControl
                    disabled={!item.required && !item.relevant}
                    component="fieldset"
                    fullWidth
                    size="small"
                    sx={{ pb: 1 }}
                >
                    <FormItemHeader item={item} toggleRelevant={toggleRelevant} />
                    <Select
                        value={item.value ? item.value[0] : ""}
                        onChange={(evt) => handleChange(evt.target.value)}
                        id={item.id}
                    >
                        {item.options.map((option) => (
                            <MenuItem key={option} value={option}>
                                {option}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            );

        case ChecklistItemType.Text:
            return (
                <FormControl
                    disabled={!item.required && !item.relevant && !item.value}
                    component="fieldset"
                    fullWidth
                    size="small"
                    sx={{ pb: 1 }}
                >
                    <FormItemHeader item={item} toggleRelevant={toggleRelevant} />
                    <OutlinedInput
                        value={item.value ? item.value[0] : ""}
                        onChange={(evt) => handleChange(evt.target.value)}
                        multiline
                        minRows={3}
                        maxRows={5}
                        sx={{ pr: 0 }}
                        id={item.id}
                    />
                </FormControl>
            );

        default:
            return null;
    }
}
