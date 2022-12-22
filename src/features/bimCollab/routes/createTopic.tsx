import {
    Box,
    useTheme,
    Button,
    FormControlLabel,
    FormControl,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Select,
    Checkbox,
    ListItemText,
    TextFieldProps,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { useParams, useHistory } from "react-router-dom";
import { FormEvent, useState } from "react";
import { ArrowBack } from "@mui/icons-material";
import { isValid, set } from "date-fns";

import { Divider, IosSwitch, LinearProgress, ScrollBox, TextField, Tooltip } from "components";
import { useToggle } from "hooks/useToggle";

import {
    useGetProjectExtensionsQuery,
    useGetProjectQuery,
    useCreateTopicMutation,
    useCreateCommentMutation,
    useCreateViewpointMutation,
} from "../bimCollabApi";
import { NewViewpoint, IncludeViewpoint } from "../includeViewpoint";

const today = new Date();

export function CreateTopic() {
    const theme = useTheme();
    const history = useHistory();

    const { projectId } = useParams<{ projectId: string }>();
    const { data: project } = useGetProjectQuery({ projectId });
    const { data: extensions } = useGetProjectExtensionsQuery({ projectId });
    const [createTopic, { isLoading: creatingTopic }] = useCreateTopicMutation();
    const [createComment, { isLoading: creatingComment }] = useCreateCommentMutation();
    const [createViewpoint, { isLoading: creatingViewpoint }] = useCreateViewpointMutation();

    const [fields, setFields] = useState({
        title: "",
        comment: "",
        type: "",
        area: "",
        stage: "",
        status: "",
        labels: [] as string[],
        priority: "",
        deadline: "",
        assigned: "",
    });
    const { title, comment, type, area, stage, status, labels, priority, deadline, assigned } = fields;
    const [includeViewpoint, toggleIncludeViewpoint] = useToggle(true);
    const [viewpoint, setViewpoint] = useState<NewViewpoint>();

    const handleInputChange = ({ name, value }: { name: string; value: string | string[] }) => {
        setFields((state) => ({ ...state, [name]: value }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!title) {
            return;
        }

        let topic = {
            projectId,
            title,
            area,
            stage,
            labels,
            priority,
            topic_type: type,
            topic_status: status,
            due_date: deadline,
            assigned_to: assigned,
        };
        topic = Object.fromEntries(Object.entries(topic).filter(([_, value]) => value.length)) as typeof topic;

        const topicRes = await createTopic(topic);

        if (!("data" in topicRes)) {
            return;
        }

        const topicId = topicRes.data.guid;

        if (viewpoint) {
            const viewpointRes = await createViewpoint({
                projectId,
                topicId,
                ...viewpoint,
            });

            const viewpointGuid = "data" in viewpointRes ? viewpointRes.data.guid : undefined;
            await createComment({ projectId, topicId, comment, viewpoint_guid: viewpointGuid });
        } else {
            await createComment({ projectId, topicId, comment });
        }

        history.goBack();
    };

    if (!project || !extensions) {
        return <LinearProgress />;
    }

    const disabled = creatingTopic || creatingComment || creatingViewpoint;
    const areas = extensions.fields?.find((field) => field.field === "area")?.values.filter((field) => field.is_active);

    return (
        <>
            <Box px={1}>
                <Divider />
            </Box>
            <Box display="flex" alignItems="center" boxShadow={theme.customShadows.widgetHeader}>
                <Button onClick={() => history.goBack()} color="grey">
                    <ArrowBack sx={{ mr: 1 }} />
                    Back
                </Button>
                <Divider orientation="vertical" sx={{ height: "80%" }} />
                <Tooltip title="Includes the current view state at the time this is enabled. Toggle to update.">
                    <FormControlLabel
                        sx={{ m: 0, pl: 1, display: "flex", alignItems: "center" }}
                        control={
                            <IosSwitch checked={includeViewpoint} color="primary" onChange={toggleIncludeViewpoint} />
                        }
                        label={
                            <Box fontSize={14} lineHeight={"24.5px"} fontWeight={500}>
                                Include viewpoint
                            </Box>
                        }
                        labelPlacement="start"
                    />
                </Tooltip>
            </Box>
            <Box position="relative">{disabled ? <LinearProgress /> : null}</Box>
            <ScrollBox py={1} height={1}>
                <Box sx={{ px: 1, my: 1 }}>
                    <IncludeViewpoint include={includeViewpoint} viewpoint={viewpoint} setViewpoint={setViewpoint} />

                    <form onSubmit={handleSubmit}>
                        <TextField
                            name="title"
                            value={title}
                            onChange={(e) => handleInputChange(e.target)}
                            sx={{ mb: 1, mt: 1 }}
                            id={"topic-title"}
                            label={"Title"}
                            fullWidth
                            required
                        />

                        <TextField
                            name="comment"
                            value={comment}
                            onChange={(e) => handleInputChange(e.target)}
                            sx={{ mb: 1 }}
                            id={"topic-comment"}
                            label={"Comment"}
                            fullWidth
                            multiline
                            rows={4}
                        />

                        {areas && areas.length ? (
                            <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                                <InputLabel id="bcf-topic-area-label">Area</InputLabel>
                                <Select
                                    labelId="bcf-topic-area-label"
                                    id="bcf-topic-area"
                                    fullWidth
                                    value={area}
                                    onChange={(e) => handleInputChange(e.target)}
                                    input={<OutlinedInput label="Area" />}
                                    name={"area"}
                                >
                                    {areas.map((topicArea) => (
                                        <MenuItem
                                            key={topicArea.value}
                                            value={topicArea.value}
                                            sx={{
                                                fontWeight: area === topicArea.value ? "bold" : "regular",
                                            }}
                                        >
                                            {topicArea.value}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        ) : null}

                        <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                            <InputLabel id="bcf-topic-type-label">Type</InputLabel>
                            <Select
                                labelId="bcf-topic-type-label"
                                id="bcf-topic-type"
                                fullWidth
                                value={type}
                                onChange={(e) => handleInputChange(e.target)}
                                input={<OutlinedInput label="Type" />}
                                name={"type"}
                            >
                                {extensions.topic_type.map((topicType) => (
                                    <MenuItem
                                        key={topicType}
                                        value={topicType}
                                        sx={{
                                            fontWeight: type === topicType ? "bold" : "regular",
                                        }}
                                    >
                                        {topicType}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                            <InputLabel id="bcf-topic-priority-label">Priority</InputLabel>
                            <Select
                                labelId="bcf-topic-priority-label"
                                id="bcf-topic-priority"
                                fullWidth
                                value={priority}
                                onChange={(e) => handleInputChange(e.target)}
                                input={<OutlinedInput label="Priority" />}
                                name={"priority"}
                            >
                                {extensions.priority.map((topicPriority) => (
                                    <MenuItem
                                        key={topicPriority}
                                        value={topicPriority}
                                        sx={{
                                            fontWeight: priority === topicPriority ? "bold" : "regular",
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
                                fullWidth
                                value={stage}
                                onChange={(e) => handleInputChange(e.target)}
                                input={<OutlinedInput label="Milestone" />}
                                name={"stage"}
                            >
                                {extensions.stage.map((topicStage) => (
                                    <MenuItem
                                        key={topicStage}
                                        value={topicStage}
                                        sx={{
                                            fontWeight: stage === topicStage ? "bold" : "regular",
                                        }}
                                    >
                                        {topicStage}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                            <InputLabel id="bcf-topic-status-label">Status</InputLabel>
                            <Select
                                labelId="bcf-topic-status-label"
                                id="bcf-topic-status"
                                fullWidth
                                value={status}
                                onChange={(e) => handleInputChange(e.target)}
                                input={<OutlinedInput label="Status" />}
                                name={"status"}
                            >
                                {extensions.topic_status.map((topicStatus) => (
                                    <MenuItem
                                        key={topicStatus}
                                        value={topicStatus}
                                        sx={{
                                            fontWeight: status === topicStatus ? "bold" : "regular",
                                        }}
                                    >
                                        {topicStatus}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                            <InputLabel id="bcf-topic-assigned-label">Assigned to</InputLabel>
                            <Select
                                labelId="bcf-topic-assigned-label"
                                id="bcf-topic-assigned"
                                fullWidth
                                value={assigned}
                                onChange={(e) => handleInputChange(e.target)}
                                input={<OutlinedInput label="Assigned to" />}
                                name={"assigned"}
                            >
                                {extensions.user_id_type.map((user) => (
                                    <MenuItem
                                        key={user}
                                        value={user}
                                        sx={{
                                            fontWeight: assigned === user ? "bold" : "regular",
                                        }}
                                    >
                                        {user}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                            <DatePicker
                                label="Deadline"
                                value={deadline || null}
                                minDate={today}
                                onChange={(newDate: Date | null) =>
                                    handleInputChange({
                                        name: "deadline",
                                        value: newDate
                                            ? isValid(newDate)
                                                ? set(newDate, { hours: 0, minutes: 0, seconds: 0 }).toISOString()
                                                : ""
                                            : "",
                                    })
                                }
                                renderInput={(params: TextFieldProps) => <TextField {...params} size="small" />}
                            />
                        </FormControl>

                        <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                            <InputLabel id="bcf-topic-labels-label">Labels</InputLabel>
                            <Select
                                labelId="bcf-topic-labels-label"
                                id="bcf-topic-labels"
                                fullWidth
                                multiple
                                value={labels}
                                renderValue={(selected) => selected.join(", ")}
                                onChange={(e) => handleInputChange(e.target)}
                                input={<OutlinedInput label="Label" />}
                                name={"labels"}
                            >
                                {extensions.topic_label.map((topicLabel) => (
                                    <MenuItem key={topicLabel} value={topicLabel}>
                                        <Checkbox checked={labels.includes(topicLabel)} />
                                        <ListItemText primary={topicLabel} />
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Box display="flex" justifyContent="space-between" mb={2}>
                            <Button
                                variant="outlined"
                                color="grey"
                                type="button"
                                fullWidth
                                disabled={disabled}
                                onClick={() => history.goBack()}
                            >
                                Cancel
                            </Button>
                            <Button
                                sx={{ ml: 2 }}
                                fullWidth
                                variant="contained"
                                type="submit"
                                disabled={disabled || (includeViewpoint && !viewpoint)}
                            >
                                Create issue
                            </Button>
                        </Box>
                    </form>
                </Box>
            </ScrollBox>
        </>
    );
}
