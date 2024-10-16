import { ArrowBack } from "@mui/icons-material";
import {
    Box,
    Button,
    Checkbox,
    FormControl,
    InputLabel,
    ListItemText,
    MenuItem,
    OutlinedInput,
    Select,
    SelectChangeEvent,
    useTheme,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { isValid, set } from "date-fns";
import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, LinearProgress, ScrollBox } from "components";

import { useGetProjectExtensionsQuery } from "../bimTrackApi";
import {
    bimTrackActions,
    FilterModifier,
    FilterType,
    initialFilterModifiers,
    initialFilters,
    selectFilterModifiers,
    selectFilters,
} from "../bimTrackSlice";

export function Filters() {
    const { t } = useTranslation();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const history = useHistory();

    const { projectId } = useParams<{ projectId: string }>();
    const { data: extensions } = useGetProjectExtensionsQuery({ projectId });

    const savedFilters = useAppSelector(selectFilters);
    const [filters, setFilters] = useState(savedFilters);

    const savedModifiers = useAppSelector(selectFilterModifiers);
    const [filterModifiers, setFilterModifiers] = useState(savedModifiers);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        dispatch(bimTrackActions.setFilters(filters));
        dispatch(bimTrackActions.setFilterModifiers(filterModifiers));
        history.goBack();
    };

    const handleReset = (e: FormEvent) => {
        e.preventDefault();
        setFilters(initialFilters);
        setFilterModifiers(initialFilterModifiers);
    };

    const handleFilterChange = ({ target: { value, name } }: SelectChangeEvent<string | string[]>) => {
        // On autofill we get the stringified value.
        setFilters((_filters) => ({
            ...filters,
            [name]: typeof value === "string" ? value.split(",") : value,
        }));
    };

    const handleFilterModifierChange = ({ target: { value, name } }: SelectChangeEvent<string>) => {
        setFilterModifiers((modifiers) => ({
            ...modifiers,
            [name]: value,
        }));
    };

    if (!extensions) {
        return (
            <Box position="relative">
                <LinearProgress />
            </Box>
        );
    }

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
            <ScrollBox p={1} pb={5} height={1} position="relative" sx={{ mt: 1, form: { width: 1 } }}>
                <form onSubmit={handleSubmit} onReset={handleReset}>
                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-type-label">{t("type")}</InputLabel>
                        <Select
                            labelId="bcf-topic-type-label"
                            id="bcf-topic-type"
                            multiple
                            renderValue={(selected) => selected.join(", ")}
                            fullWidth
                            value={filters[FilterType.Type]}
                            onChange={handleFilterChange}
                            input={<OutlinedInput label="Type" />}
                            name={FilterType.Type}
                        >
                            {extensions.topic_type.map((topicType) => (
                                <MenuItem key={topicType} value={topicType}>
                                    <Checkbox checked={filters[FilterType.Type].includes(topicType)} />
                                    <ListItemText primary={topicType} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-label-label">{t("label")}</InputLabel>
                        <Select
                            labelId="bcf-topic-label-label"
                            id="bcf-topic-label"
                            multiple
                            renderValue={(selected) => selected.join(", ")}
                            fullWidth
                            value={filters[FilterType.Label]}
                            onChange={handleFilterChange}
                            input={<OutlinedInput label="Label" />}
                            name={FilterType.Label}
                        >
                            {extensions.topic_label.map((topicLabel) => (
                                <MenuItem key={topicLabel} value={topicLabel}>
                                    <Checkbox checked={filters[FilterType.Label].includes(topicLabel)} />
                                    <ListItemText primary={topicLabel} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-status-label">{t("status")}</InputLabel>
                        <Select
                            labelId="bcf-topic-status-label"
                            id="bcf-topic-status"
                            multiple
                            renderValue={(selected) => selected.join(", ")}
                            fullWidth
                            value={filters[FilterType.Status]}
                            onChange={handleFilterChange}
                            input={<OutlinedInput label="Status" />}
                            name={FilterType.Status}
                        >
                            {extensions.topic_status.map((topicStatus) => (
                                <MenuItem key={topicStatus} value={topicStatus}>
                                    <Checkbox checked={filters[FilterType.Status].includes(topicStatus)} />
                                    <ListItemText primary={topicStatus} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-priority-label">{t("priority")}</InputLabel>
                        <Select
                            labelId="bcf-topic-priority-label"
                            id="bcf-topic-priority"
                            multiple
                            renderValue={(selected) => selected.join(", ")}
                            fullWidth
                            value={filters[FilterType.Priority]}
                            onChange={handleFilterChange}
                            input={<OutlinedInput label="Priority" />}
                            name={FilterType.Priority}
                        >
                            {extensions.priority.map((topicPriority) => (
                                <MenuItem key={topicPriority} value={topicPriority}>
                                    <Checkbox checked={filters[FilterType.Priority].includes(topicPriority)} />
                                    <ListItemText primary={topicPriority} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {extensions.stage.length ? (
                        <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                            <InputLabel id="bcf-topic-stage-label">{t("phase")}</InputLabel>
                            <Select
                                labelId="bcf-topic-stage-label"
                                id="bcf-topic-stage"
                                multiple
                                renderValue={(selected) =>
                                    selected.map((val) => (val === "NOT_SET" ? "Undecided" : val)).join(", ")
                                }
                                fullWidth
                                value={filters[FilterType.Stage]}
                                onChange={handleFilterChange}
                                input={<OutlinedInput label="Phase" />}
                                name={FilterType.Stage}
                            >
                                <MenuItem value={"NOT_SET"}>
                                    <Checkbox checked={filters[FilterType.Stage].includes("NOT_SET")} />
                                    <ListItemText primary={"Undecided"} />
                                </MenuItem>
                                {extensions.stage.map((stage) => (
                                    <MenuItem key={stage} value={stage}>
                                        <Checkbox checked={filters[FilterType.Stage].includes(stage)} />
                                        <ListItemText primary={stage} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    ) : null}

                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-createdBy-label">{t("createdBy")}</InputLabel>
                        <Select
                            labelId="bcf-topic-createdBy-label"
                            id="bcf-topic-createdBy"
                            multiple
                            renderValue={(selected) => selected.join(", ")}
                            fullWidth
                            value={filters[FilterType.CreatedBy]}
                            onChange={handleFilterChange}
                            input={<OutlinedInput label="Created by" />}
                            name={FilterType.CreatedBy}
                        >
                            {extensions.user_id_type.map((user) => (
                                <MenuItem key={user} value={user}>
                                    <Checkbox checked={filters[FilterType.CreatedBy].includes(user)} />
                                    <ListItemText primary={user} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-assignedTo-label">{t("assignedTo")}</InputLabel>
                        <Select
                            labelId="bcf-topic-assignedTo-label"
                            id="bcf-topic-assignedTo"
                            multiple
                            renderValue={(selected) =>
                                selected.map((val) => (val === "" ? "Unassigned" : val)).join(", ")
                            }
                            fullWidth
                            value={filters[FilterType.AssignedTo]}
                            onChange={handleFilterChange}
                            input={<OutlinedInput label="Assigned To" />}
                            name={FilterType.AssignedTo}
                        >
                            <MenuItem value={""}>
                                <Checkbox checked={filters[FilterType.AssignedTo].includes("")} />
                                <ListItemText primary={"Unassigned"} />
                            </MenuItem>
                            {extensions.user_id_type.map((user) => (
                                <MenuItem key={user} value={user}>
                                    <Checkbox checked={filters[FilterType.AssignedTo].includes(user)} />
                                    <ListItemText primary={user} />
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Box display="flex">
                        <FormControl size="small" sx={{ minWidth: 72, mb: 2, textAlign: "center", mr: 1 }}>
                            <InputLabel id="bcf-topic-deadline-operator-label">{t("operator")}</InputLabel>
                            <Select
                                labelId="bcf-topic-deadline-operator-label"
                                id="bcf-topic-deadline-operator"
                                value={filterModifiers[FilterModifier.DeadlineOperator]}
                                onChange={handleFilterModifierChange}
                                input={<OutlinedInput label="Operator" />}
                                name={FilterModifier.DeadlineOperator}
                            >
                                {["=", ">=", "<="].map((operator) => (
                                    <MenuItem
                                        key={operator}
                                        value={operator}
                                        sx={{
                                            fontWeight:
                                                filterModifiers[FilterModifier.DeadlineOperator] === operator
                                                    ? "bold"
                                                    : "regular",
                                        }}
                                    >
                                        {operator}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                            <DatePicker
                                label="Deadline"
                                value={
                                    isValid(new Date(filters[FilterType.Deadline]))
                                        ? new Date(filters[FilterType.Deadline])
                                        : null
                                }
                                onChange={(newDate: Date | null) =>
                                    setFilters((state) => ({
                                        ...state,
                                        [FilterType.Deadline]: newDate
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
                    </Box>

                    <Box display="flex" justifyContent="space-between" mb={2}>
                        <Button variant="outlined" color="grey" type="reset" fullWidth>
                            {t("resetFilter")}
                        </Button>
                        <Button sx={{ ml: 2 }} fullWidth variant="contained" type="submit">
                            {t("saveFilter")}
                        </Button>
                    </Box>
                </form>
            </ScrollBox>
        </>
    );
}
