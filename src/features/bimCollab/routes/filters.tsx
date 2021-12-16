import { useState, FormEvent } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
    useTheme,
    SelectChangeEvent,
    Box,
    FormControl,
    InputLabel,
    Select,
    OutlinedInput,
    MenuItem,
    Button,
    TextField,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";
import { DatePicker } from "@mui/lab";

import { LinearProgress, ScrollBox } from "components";
import { useAppDispatch, useAppSelector } from "app/store";

import { useGetProjectExtensionsQuery } from "../bimCollabApi";
import {
    bimCollabActions,
    FilterModifier,
    FilterType,
    initialFilterModifiers,
    initialFilters,
    selectFilterModifiers,
    selectFilters,
} from "../bimCollabSlice";

export function Filters() {
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
        dispatch(bimCollabActions.setFilters(filters));
        dispatch(bimCollabActions.setFilterModifiers(filterModifiers));
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
        return <LinearProgress />;
    }

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Button onClick={() => history.goBack()} color="grey">
                    <ArrowBack sx={{ mr: 1 }} />
                    Back
                </Button>
            </Box>
            <ScrollBox p={1} pb={5} height={1} position="relative" sx={{ mt: 1, form: { width: 1 } }}>
                <form onSubmit={handleSubmit} onReset={handleReset}>
                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-type-label">Type</InputLabel>
                        <Select
                            labelId="bcf-topic-type-label"
                            id="bcf-topic-type"
                            multiple
                            fullWidth
                            value={filters[FilterType.Type]}
                            onChange={handleFilterChange}
                            input={<OutlinedInput label="Type" />}
                            name={FilterType.Type}
                        >
                            {extensions.topic_type.map((topicType) => (
                                <MenuItem
                                    key={topicType}
                                    value={topicType}
                                    sx={{
                                        fontWeight: filters[FilterType.Type].includes(topicType) ? "bold" : "regular",
                                    }}
                                >
                                    {topicType}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-label-label">Label</InputLabel>
                        <Select
                            labelId="bcf-topic-label-label"
                            id="bcf-topic-label"
                            multiple
                            fullWidth
                            value={filters[FilterType.Label]}
                            onChange={handleFilterChange}
                            input={<OutlinedInput label="Label" />}
                            name={FilterType.Label}
                        >
                            {extensions.topic_label.map((topicLabel) => (
                                <MenuItem
                                    key={topicLabel}
                                    value={topicLabel}
                                    sx={{
                                        fontWeight: filters[FilterType.Label].includes(topicLabel) ? "bold" : "regular",
                                    }}
                                >
                                    {topicLabel}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-status-label">Status</InputLabel>
                        <Select
                            labelId="bcf-topic-status-label"
                            id="bcf-topic-status"
                            multiple
                            fullWidth
                            value={filters[FilterType.Status]}
                            onChange={handleFilterChange}
                            input={<OutlinedInput label="Status" />}
                            name={FilterType.Status}
                        >
                            {extensions.topic_status.map((topicStatus) => (
                                <MenuItem
                                    key={topicStatus}
                                    value={topicStatus}
                                    sx={{
                                        fontWeight: filters[FilterType.Status].includes(topicStatus)
                                            ? "bold"
                                            : "regular",
                                    }}
                                >
                                    {topicStatus}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-priority-label">Priority</InputLabel>
                        <Select
                            labelId="bcf-topic-priority-label"
                            id="bcf-topic-priority"
                            multiple
                            fullWidth
                            value={filters[FilterType.Priority]}
                            onChange={handleFilterChange}
                            input={<OutlinedInput label="Priority" />}
                            name={FilterType.Priority}
                        >
                            {extensions.priority.map((topicPriority) => (
                                <MenuItem
                                    key={topicPriority}
                                    value={topicPriority}
                                    sx={{
                                        fontWeight: filters[FilterType.Priority].includes(topicPriority)
                                            ? "bold"
                                            : "regular",
                                    }}
                                >
                                    {topicPriority}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-stage-label">Milestone</InputLabel>
                        <Select
                            labelId="bcf-topic-stage-label"
                            id="bcf-topic-stage"
                            multiple
                            fullWidth
                            value={filters[FilterType.Stage]}
                            onChange={handleFilterChange}
                            input={<OutlinedInput label="Milestone" />}
                            name={FilterType.Stage}
                        >
                            <MenuItem
                                value={"NOT_SET"}
                                sx={{ fontWeight: filters[FilterType.Stage].includes("NOT_SET") ? "bold" : "regular" }}
                            >
                                Undecided
                            </MenuItem>
                            {extensions.stage.map((stage) => (
                                <MenuItem
                                    key={stage}
                                    value={stage}
                                    sx={{
                                        fontWeight: filters[FilterType.Stage].includes(stage) ? "bold" : "regular",
                                    }}
                                >
                                    {stage}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-createdBy-label">Created by</InputLabel>
                        <Select
                            labelId="bcf-topic-createdBy-label"
                            id="bcf-topic-createdBy"
                            multiple
                            fullWidth
                            value={filters[FilterType.CreatedBy]}
                            onChange={handleFilterChange}
                            input={<OutlinedInput label="Created by" />}
                            name={FilterType.CreatedBy}
                        >
                            {extensions.user_id_type.map((user) => (
                                <MenuItem
                                    key={user}
                                    value={user}
                                    sx={{
                                        fontWeight: filters[FilterType.CreatedBy].includes(user) ? "bold" : "regular",
                                    }}
                                >
                                    {user}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-assignedTo-label">Assigned To</InputLabel>
                        <Select
                            labelId="bcf-topic-assignedTo-label"
                            id="bcf-topic-assignedTo"
                            multiple
                            fullWidth
                            value={filters[FilterType.AssignedTo]}
                            onChange={handleFilterChange}
                            input={<OutlinedInput label="Assigned To" />}
                            name={FilterType.AssignedTo}
                        >
                            <MenuItem
                                value={""}
                                sx={{ fontWeight: filters[FilterType.AssignedTo].includes("") ? "bold" : "regular" }}
                            >
                                Unassigned
                            </MenuItem>
                            {extensions.user_id_type.map((user) => (
                                <MenuItem
                                    key={user}
                                    value={user}
                                    sx={{
                                        fontWeight: filters[FilterType.AssignedTo].includes(user) ? "bold" : "regular",
                                    }}
                                >
                                    {user}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Box display="flex">
                        <FormControl size="small" sx={{ minWidth: 72, mb: 2, textAlign: "center", mr: 1 }}>
                            <InputLabel id="bcf-topic-deadline-operator-label">Operator</InputLabel>
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
                                value={filters[FilterType.Deadline] || null}
                                onChange={(newDate: Date | null) =>
                                    setFilters((state) => ({
                                        ...state,
                                        [FilterType.Deadline]: newDate?.toISOString() ?? "",
                                    }))
                                }
                                renderInput={(params) => <TextField {...params} size="small" />}
                            />
                        </FormControl>
                    </Box>

                    <Box display="flex" justifyContent="space-between" mb={2}>
                        <Button variant="outlined" color="grey" type="reset" fullWidth>
                            Reset filter
                        </Button>
                        <Button sx={{ ml: 2 }} fullWidth variant="contained" type="submit">
                            Save filter
                        </Button>
                    </Box>
                </form>
            </ScrollBox>
        </>
    );
}
