import { ArrowBack } from "@mui/icons-material";
import { Box, Button, FormControlLabel, useTheme } from "@mui/material";
import { FormEvent, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { Divider, IosSwitch, LinearProgress, ScrollBox, TextField, Tooltip } from "components";
import { useToggle } from "hooks/useToggle";

import {
    useCreateCommentMutation,
    useCreateViewpointMutation,
    useGetProjectExtensionsQuery,
    useGetProjectQuery,
} from "../bimTrackApi";
import { IncludeViewpoint, NewViewpoint } from "../includeViewpoint";

export function CreateComment() {
    const theme = useTheme();
    const history = useHistory();

    const { projectId, topicId } = useParams<{ projectId: string; topicId: string }>();
    const { data: project } = useGetProjectQuery({ projectId });
    const { data: extensions } = useGetProjectExtensionsQuery({ projectId });
    const [createComment, { isLoading: creatingComment }] = useCreateCommentMutation();
    const [createViewpoint, { isLoading: creatingViewpoint }] = useCreateViewpointMutation();

    const [includeViewpoint, toggleIncludeViewpoint] = useToggle(true);
    const [comment, setComment] = useState("");
    const [viewpoint, setViewpoint] = useState<NewViewpoint>();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

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
        return (
            <Box position="relative">
                <LinearProgress />
            </Box>
        );
    }

    const disabled = creatingComment || creatingViewpoint;

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
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            sx={{ mt: 1, mb: 2 }}
                            id={"topic-comment"}
                            label={"Add comment"}
                            fullWidth
                            multiline
                            rows={4}
                        />

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
                                Add comment
                            </Button>
                        </Box>
                    </form>
                </Box>
            </ScrollBox>
        </>
    );
}
