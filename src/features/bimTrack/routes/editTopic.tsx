import { ArrowBack } from "@mui/icons-material";
import { Button, useTheme, Box, FormControl, InputLabel, MenuItem, OutlinedInput, Select } from "@mui/material";
import { useHistory, useParams } from "react-router-dom";
import { FormEventHandler, useEffect, useState } from "react";

import { LinearProgress, Divider } from "components";

import { useGetProjectExtensionsQuery, useGetTopicQuery, useUpdateTopicMutation } from "../bimTrackApi";

const UNASSIGNED = "unassigned";

export function EditTopic() {
    const theme = useTheme();
    const history = useHistory();

    const { projectId, topicId } = useParams<{ projectId: string; topicId: string }>();
    const { data: topic } = useGetTopicQuery({ projectId, topicId });
    const { data: extensions } = useGetProjectExtensionsQuery({ projectId });
    const [updateTopic, { isLoading: disabled }] = useUpdateTopicMutation();

    const [topicStatus, setTopicStatus] = useState("");
    const [assignedTo, setAssignedTo] = useState(topic ? topic.assigned_to ?? UNASSIGNED : "");

    useEffect(() => {
        if (!topic) {
            return;
        }

        if (!assignedTo) {
            setAssignedTo(topic.assigned_to ?? UNASSIGNED);
        }

        if (!topicStatus) {
            setTopicStatus(topic.topic_status);
        }
    }, [topic, assignedTo, topicStatus]);

    if (!topic || !extensions) {
        return <LinearProgress />;
    }

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();

        await updateTopic({
            projectId,
            topicId,
            ...topic,
            topic_status: topicStatus,
            assigned_to: assignedTo === UNASSIGNED ? null : assignedTo,
        });
        history.goBack();
    };

    const availableStatuses = topic.authorization?.topic_status ?? extensions.topic_status ?? [];

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
            <Box mt={1} p={1}>
                <form onSubmit={handleSubmit}>
                    <FormControl size="small" sx={{ width: 1, mb: 2 }}>
                        <InputLabel id="bcf-topic-status-label">Status</InputLabel>
                        <Select
                            labelId="bcf-topic-status-label"
                            id="bcf-topic-status"
                            fullWidth
                            value={topicStatus}
                            onChange={(e) => setTopicStatus(e.target.value)}
                            input={<OutlinedInput label="Status" />}
                            name={"status"}
                        >
                            {!availableStatuses.includes(topic.topic_status) ? (
                                <MenuItem
                                    value={topic.topic_status}
                                    sx={{
                                        fontWeight: topicStatus === topic.topic_status ? "bold" : "regular",
                                    }}
                                >
                                    {topic.topic_status}
                                </MenuItem>
                            ) : null}
                            {availableStatuses.map((val) => (
                                <MenuItem
                                    key={val}
                                    value={val}
                                    sx={{
                                        fontWeight: topicStatus === val ? "bold" : "regular",
                                    }}
                                >
                                    {val}
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
                            value={assignedTo}
                            onChange={(e) => setAssignedTo(e.target.value)}
                            input={<OutlinedInput label="Assigned to" />}
                            name={"assigned"}
                        >
                            <MenuItem
                                value={UNASSIGNED}
                                sx={{ fontWeight: assignedTo === UNASSIGNED ? "bold" : "regular" }}
                            >
                                Unassigned
                            </MenuItem>
                            {topic.assigned_to && !extensions.user_id_type.includes(topic.assigned_to) ? (
                                <MenuItem
                                    value={topic.assigned_to}
                                    sx={{
                                        fontWeight: assignedTo === topic.assigned_to ? "bold" : "regular",
                                    }}
                                >
                                    {topic.assigned_to}
                                </MenuItem>
                            ) : null}
                            {extensions.user_id_type.map((user) => (
                                <MenuItem
                                    key={user}
                                    value={user}
                                    sx={{
                                        fontWeight: assignedTo === user ? "bold" : "regular",
                                    }}
                                >
                                    {user}
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
                        <Button sx={{ ml: 2 }} fullWidth variant="contained" type="submit" disabled={disabled}>
                            Save
                        </Button>
                    </Box>
                </form>
            </Box>
        </>
    );
}
