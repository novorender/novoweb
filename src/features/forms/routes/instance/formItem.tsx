import { NotInterested, OpenInNew } from "@mui/icons-material";
import {
    Box,
    Checkbox,
    FormControl,
    FormControlLabel,
    FormGroup,
    FormLabel,
    IconButton,
    Link,
    MenuItem,
    OutlinedInput,
    Radio,
    RadioGroup,
    Select,
} from "@mui/material";
import { type Dispatch, type MouseEvent, type SetStateAction, useState } from "react";

import { type FormItem, FormItemType } from "../../types";

// Based on https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/debug/browser/linkDetector.ts
function mapLinks(text?: string[] | null) {
    if (!text) {
        return null;
    }

    const CONTROL_CODES = "\\u0000-\\u0020\\u007f-\\u009f";
    const URL_REGEX = new RegExp(
        "(?:[a-zA-Z][a-zA-Z0-9+.-]{2,}:\\/\\/|data:|www\\.)[^\\s" +
            CONTROL_CODES +
            '"]{2,}[^\\s' +
            CONTROL_CODES +
            "\"')}\\],:;.!?]",
        "ug"
    );

    const result = [] as (string | JSX.Element)[];

    const split = (text: string, regexIndex: number) => {
        if (regexIndex >= 1) {
            result.push(text);
            return;
        }
        let currentIndex = 0;
        let match;
        URL_REGEX.lastIndex = 0;
        while ((match = URL_REGEX.exec(text)) !== null) {
            const stringBeforeMatch = text.substring(currentIndex, match.index);
            if (stringBeforeMatch) {
                split(stringBeforeMatch, regexIndex + 1);
            }
            const linkText = match[0];
            const href =
                linkText.startsWith("http://") || linkText.startsWith("https://") ? linkText : `http://${linkText}`;
            result.push(
                <Link href={href} target="_blank" rel="noopener noreferrer" key={href}>
                    {linkText}
                    <OpenInNew fontSize="small" style={{ marginLeft: "5px" }} />
                </Link>
            );
            currentIndex = match.index + linkText.length;
        }
        const stringAfterMatches = text.substring(currentIndex);
        if (stringAfterMatches) {
            split(stringAfterMatches, regexIndex + 1);
        }
    };

    split(text[0], 0);

    return result;
}

const FormItemHeader = ({ item, toggleRelevant }: { item: FormItem; toggleRelevant?: () => void }) => (
    <Box width={1} display="flex" justifyContent="space-between" alignItems="center">
        <FormLabel component="legend" sx={{ fontWeight: 600, color: "text.primary" }}>
            {item.title}
        </FormLabel>
        {!item.required && typeof toggleRelevant === "function" && (
            <IconButton size="small" color={item.relevant ? "secondary" : "primary"} onClick={toggleRelevant}>
                <NotInterested fontSize="small" />
            </IconButton>
        )}
    </Box>
);

export function FormItem({ item, setItems }: { item: FormItem; setItems: Dispatch<SetStateAction<FormItem[]>> }) {
    const [editing, setEditing] = useState(false);

    const handleChange = (value: string) => {
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
    };

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

    const handleTextFieldClick = (event: MouseEvent<HTMLDivElement>) => {
        if (event.target instanceof HTMLAnchorElement || event.target instanceof SVGElement) {
            // Don't turn on editing mode when the link was clicked
            return;
        }
        setEditing(true);
    };

    const handleTextFieldBlur = () => {
        setEditing(false);
    };

    switch (item.type) {
        case FormItemType.Checkbox:
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

        case FormItemType.YesNo:
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

        case FormItemType.TrafficLight:
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

        case FormItemType.Dropdown:
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

        case FormItemType.Input:
            return (
                <FormControl
                    disabled={!item.required && !item.relevant && !item.value}
                    component="fieldset"
                    fullWidth
                    size="small"
                    sx={{ pb: 1 }}
                >
                    <FormItemHeader item={item} toggleRelevant={toggleRelevant} />
                    <Box onClick={handleTextFieldClick}>
                        {!editing && (item.value || (!item.required && !item.relevant)) ? (
                            <Box>
                                {item.value?.[0].split("\n").map((line, idx) => (
                                    <Box key={item.id! + idx} sx={{ wordWrap: "break-word", overflowWrap: "anywhere" }}>
                                        {mapLinks([line])}
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <OutlinedInput
                                value={item.value ? item.value[0] : ""}
                                onChange={(evt) => handleChange(evt.target.value)}
                                onBlur={handleTextFieldBlur}
                                multiline
                                minRows={3}
                                maxRows={5}
                                sx={{ pr: 0 }}
                                id={item.id}
                            />
                        )}
                    </Box>
                </FormControl>
            );

        case FormItemType.Text:
            return (
                <FormControl component="fieldset" fullWidth size="small" sx={{ pb: 1 }}>
                    <FormItemHeader item={item} />
                    <Box>
                        {item.value?.[0].split("\n").map((line, idx) => (
                            <Box key={item.id! + idx} sx={{ wordWrap: "break-word", overflowWrap: "anywhere" }}>
                                {mapLinks([line])}
                            </Box>
                        ))}
                    </Box>
                </FormControl>
            );

        default:
            return null;
    }
}
