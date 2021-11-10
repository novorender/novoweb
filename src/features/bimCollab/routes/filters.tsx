import { useState, FormEvent } from "react";
import { useHistory, useParams } from "react-router-dom";
import {
    useTheme,
    SelectChangeEvent,
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    OutlinedInput,
    MenuItem,
    Button,
} from "@mui/material";
import { ArrowBack } from "@mui/icons-material";

import { LinearProgress } from "components";
import { useAppDispatch, useAppSelector } from "app/store";

import { useGetProjectExtensionsQuery } from "../bimCollabApi";
import { bimCollabActions, FilterKey as FilterType, initialFilters, selectFilters } from "../bimCollabSlice";

export function Filters() {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const history = useHistory();

    const { projectId } = useParams<{ projectId: string }>();
    const { data: extensions } = useGetProjectExtensionsQuery({ projectId });

    const savedFilters = useAppSelector(selectFilters);
    const [filters, setFilters] = useState(savedFilters);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        dispatch(bimCollabActions.setFilters(filters));
        history.goBack();
    };

    const handleReset = (e: FormEvent) => {
        e.preventDefault();
        setFilters(initialFilters);
    };

    const handleChange = ({ target: { value, name } }: SelectChangeEvent<string[]>) =>
        // On autofill we get a the stringified value.
        setFilters((_filters) => ({ ...filters, [name]: typeof value === "string" ? value.split(",") : value }));

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
            <Box p={1} height={1} position="relative" sx={{ form: { width: 1 } }}>
                <Typography variant="h5" sx={{ mt: 1, mb: 2 }}>
                    Filters
                </Typography>
                <form onSubmit={handleSubmit} onReset={handleReset}>
                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-type-label">Type</InputLabel>
                        <Select
                            labelId="bcf-topic-type-label"
                            id="bcf-topic-type"
                            multiple
                            fullWidth
                            value={filters[FilterType.Type]}
                            onChange={handleChange}
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
                            onChange={handleChange}
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
                            onChange={handleChange}
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
                            onChange={handleChange}
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
                            onChange={handleChange}
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
                    <Box display="flex" justifyContent="space-between">
                        <Button type="reset" variant="contained" color="grey">
                            Reset filter
                        </Button>
                        <Button type="submit" variant="contained">
                            Save filter
                        </Button>
                    </Box>
                </form>
            </Box>
        </>
    );
}
