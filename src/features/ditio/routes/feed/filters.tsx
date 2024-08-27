import { ArrowBack } from "@mui/icons-material";
import { Box, Button, FormControl, FormControlLabel, useTheme } from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { isValid, set } from "date-fns";
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, ScrollBox, Switch as SwitchInput } from "components";

import { ditioActions, FilterType, initialFilters, selectFilters } from "../../slice";

export function Filters() {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();
    const dispatch = useAppDispatch();

    const savedFilters = useAppSelector(selectFilters);
    const [filters, setFilters] = useState(savedFilters);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        dispatch(ditioActions.setFeedScrollOffset(0));
        dispatch(ditioActions.setFilters(filters));
        history.goBack();
    };

    const handleReset = (e: FormEvent) => {
        e.preventDefault();
        setFilters(initialFilters);
        dispatch(ditioActions.resetFilters());
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Button onClick={() => history.goBack()} color="grey">
                    <ArrowBack sx={{ mr: 1 }} />
                    {t("back")}
                </Button>
            </Box>
            <ScrollBox
                p={1}
                pb={5}
                height={1}
                position="relative"
                sx={{ mt: 1, form: { width: 1 } }}
                component="form"
                onSubmit={handleSubmit}
                onReset={handleReset}
            >
                <Box display="flex" flexDirection="column">
                    <FormControlLabel
                        sx={{ ml: 0, mb: 2 }}
                        control={
                            <SwitchInput
                                checked={filters[FilterType.Posts]}
                                onChange={(_e, checked) => {
                                    if (!checked && !filters[FilterType.Alerts]) {
                                        setFilters((state) => ({
                                            ...state,
                                            [FilterType.Posts]: false,
                                            [FilterType.Alerts]: true,
                                        }));
                                    } else {
                                        setFilters((state) => ({
                                            ...state,
                                            [FilterType.Posts]: checked,
                                        }));
                                    }
                                }}
                            />
                        }
                        label={
                            <Box ml={1} fontSize={16}>
                                {t("posts")}
                            </Box>
                        }
                    />
                    <FormControlLabel
                        sx={{ ml: 0 }}
                        control={
                            <SwitchInput
                                checked={filters[FilterType.Alerts]}
                                onChange={(_e, checked) => {
                                    if (!checked && !filters[FilterType.Posts]) {
                                        setFilters((state) => ({
                                            ...state,
                                            [FilterType.Alerts]: false,
                                            [FilterType.Posts]: true,
                                        }));
                                    } else {
                                        setFilters((state) => ({
                                            ...state,
                                            [FilterType.Alerts]: checked,
                                        }));
                                    }
                                }}
                            />
                        }
                        label={
                            <Box ml={1} fontSize={16}>
                                {t("alerts")}
                            </Box>
                        }
                    />
                </Box>
                <Divider sx={{ my: 1 }} />
                <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                    <DatePicker
                        label="Date from"
                        value={
                            isValid(new Date(filters[FilterType.DateFrom]))
                                ? new Date(filters[FilterType.DateFrom])
                                : null
                        }
                        onChange={(newDate: Date | null) =>
                            setFilters((state) => ({
                                ...state,
                                [FilterType.DateFrom]: newDate
                                    ? isValid(newDate)
                                        ? set(newDate, { hours: 0, minutes: 0, seconds: 0 }).toISOString()
                                        : ""
                                    : "",
                            }))
                        }
                        slotProps={{
                            textField: {
                                size: "small",
                            },
                        }}
                    />
                </FormControl>

                <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                    <DatePicker
                        label="Date to"
                        value={
                            isValid(new Date(filters[FilterType.DateTo])) ? new Date(filters[FilterType.DateTo]) : null
                        }
                        onChange={(newDate: Date | null) =>
                            setFilters((state) => ({
                                ...state,
                                [FilterType.DateTo]: newDate
                                    ? isValid(newDate)
                                        ? set(newDate, { hours: 0, minutes: 0, seconds: 0 }).toISOString()
                                        : ""
                                    : "",
                            }))
                        }
                        slotProps={{
                            textField: {
                                size: "small",
                            },
                        }}
                    />
                </FormControl>

                <Box display="flex" justifyContent="space-between" mb={2}>
                    <Button variant="outlined" color="grey" type="reset" fullWidth>
                        {t("resetFilter")}
                    </Button>
                    <Button sx={{ ml: 2 }} fullWidth variant="contained" type="submit">
                        {t("saveFilter")}
                    </Button>
                </Box>
            </ScrollBox>
        </>
    );
}
