import { ArrowBack } from "@mui/icons-material";
import {
    Button,
    useTheme,
    Box,
    FormControl,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Select,
    Typography,
} from "@mui/material";
import { useHistory, useParams } from "react-router-dom";
import { FormEventHandler, useState } from "react";

import { LinearProgress } from "components";

import { useGetTopicQuery, useUpdateTopicMutation } from "../bimCollabApi";

export function EditTopic() {
    const theme = useTheme();
    const history = useHistory();

    const { projectId, topicId } = useParams<{ projectId: string; topicId: string }>();
    const { data: topic } = useGetTopicQuery({ projectId, topicId });
    const [updateTopic, { isLoading: disabled }] = useUpdateTopicMutation();

    const [topicStatus, setTopicStatus] = useState("");

    if (!topic) {
        return <LinearProgress />;
    }

    const handleSubmit: FormEventHandler = async (e) => {
        e.preventDefault();

        await updateTopic({ projectId, topicId, ...topic, topic_status: topicStatus });
        history.goBack();
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Button onClick={() => history.goBack()} color="grey">
                    <ArrowBack sx={{ mr: 1 }} />
                    Back
                </Button>
            </Box>
            <Box p={1}>
                <Typography sx={{ mb: 2 }} variant={"h5"}>
                    Edit issue
                </Typography>
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
                            {topic.authorization.topic_status.map((val) => (
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
                    <Box display="flex" justifyContent="space-between" mb={2}>
                        <Button
                            variant="contained"
                            color="grey"
                            type="button"
                            disabled={disabled}
                            onClick={() => history.goBack()}
                        >
                            Cancel
                        </Button>
                        <Button variant="contained" type="submit" disabled={disabled}>
                            Save
                        </Button>
                    </Box>
                </form>
            </Box>
        </>
    );
}
