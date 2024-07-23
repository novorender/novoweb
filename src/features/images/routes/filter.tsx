import { ArrowBack } from "@mui/icons-material";
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    ListItemText,
    MenuItem,
    OutlinedInput,
    Select,
    useTheme,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { format, isValid, parse } from "date-fns";
import { FormEventHandler, useState } from "react";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, ScrollBox } from "components";
import { rangeSearchDateFormat } from "config/app";

import { imagesActions, selectImageFilter } from "../imagesSlice";
import { ImageType } from "../types";

export function Filter() {
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();

    const filter = useAppSelector(selectImageFilter);
    const [dateFrom, setDateFrom] = useState(filter.dateFrom);
    const [dateTo, setDateTo] = useState(filter.dateTo);
    const [type, setType] = useState(filter.type);

    const handleSubmit: FormEventHandler = (e) => {
        e.preventDefault();

        dispatch(
            imagesActions.setFilter({
                dateFrom,
                dateTo,
                type,
            })
        );

        history.goBack();
    };

    const handleReset: FormEventHandler = (e) => {
        e.preventDefault();
        setType("all");
        setDateFrom("");
        setDateTo("");
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Button onClick={() => history.goBack()} color="grey">
                    <ArrowBack sx={{ mr: 1 }} />
                    Back
                </Button>
            </Box>
            <ScrollBox px={1} pt={2} pb={3} component="form" onSubmit={handleSubmit} onReset={handleReset}>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                    <InputLabel id="image-type-label">Image type</InputLabel>
                    <Select
                        labelId="image-type-label"
                        id="image-type"
                        value={type}
                        size="small"
                        onChange={(e) => setType(e.target.value as typeof type)}
                        input={<OutlinedInput size="small" label="Image type" />}
                        name={"imageType"}
                    >
                        <MenuItem value={"all"}>
                            <ListItemText>All</ListItemText>
                        </MenuItem>
                        <MenuItem value={ImageType.Panorama}>
                            <ListItemText>Panorama</ListItemText>
                        </MenuItem>
                        <MenuItem value={ImageType.Flat}>
                            <ListItemText>Flat</ListItemText>
                        </MenuItem>
                    </Select>
                </FormControl>
                <Box mb={2}>
                    <FormControl fullWidth size="medium" sx={{ mr: 1 }}>
                        <DatePicker
                            label="Date from"
                            value={dateFrom ? parse(String(dateFrom), rangeSearchDateFormat, new Date()) : null}
                            onChange={(newDate: Date | null) =>
                                setDateFrom(newDate && isValid(newDate) ? format(newDate, rangeSearchDateFormat) : "")
                            }
                            format={rangeSearchDateFormat}
                            slotProps={{
                                textField: {
                                    size: "medium",
                                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value),
                                },
                            }}
                        />
                    </FormControl>
                </Box>
                <Box mb={3}>
                    <FormControl fullWidth size="medium" sx={{}}>
                        <DatePicker
                            label="Date to"
                            value={dateTo ? parse(String(dateTo), rangeSearchDateFormat, new Date()) : null}
                            onChange={(newDate: Date | null) =>
                                setDateTo(newDate && isValid(newDate) ? format(newDate, rangeSearchDateFormat) : "")
                            }
                            format={rangeSearchDateFormat}
                            slotProps={{
                                textField: {
                                    size: "medium",
                                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value),
                                },
                            }}
                        />
                    </FormControl>
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button variant="outlined" color="grey" type="reset">
                        Reset
                    </Button>
                    <Button sx={{ ml: 2 }} variant="contained" type="submit">
                        Save
                    </Button>
                </Box>
            </ScrollBox>
        </>
    );
}
