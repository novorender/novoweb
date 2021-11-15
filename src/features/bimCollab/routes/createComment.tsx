import { useState, FormEvent } from "react";
import { useHistory, useParams } from "react-router-dom";
import { Scene, View } from "@novorender/webgl-api";
import { Box, Typography, Button, useTheme } from "@mui/material";

import { LinearProgress, ScrollBox, TextField } from "components";

import {
    useGetProjectQuery,
    useGetProjectExtensionsQuery,
    useCreateCommentMutation,
    useCreateViewpointMutation,
} from "../bimCollabApi";
import { Viewpoint } from "../types";
import { IncludeViewpoint } from "./createTopic";

export function CreateComment({ view, scene }: { view: View; scene: Scene }) {
    const theme = useTheme();
    const history = useHistory();

    const { projectId, topicId } = useParams<{ projectId: string; topicId: string }>();
    const { data: project } = useGetProjectQuery({ projectId });
    const { data: extensions } = useGetProjectExtensionsQuery({ projectId });
    const [createComment, { isLoading: creatingComment }] = useCreateCommentMutation();
    const [createViewpoint, { isLoading: creatingViewpoint }] = useCreateViewpointMutation();

    const [comment, setComment] = useState("");
    const [viewpoint, setViewpoint] = useState<
        Partial<Viewpoint> & Pick<Viewpoint, "perspective_camera" | "snapshot">
    >();

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
        return <LinearProgress />;
    }

    const disabled = creatingComment || creatingViewpoint;

    return (
        <ScrollBox py={1} height={1} position="relative">
            <Box position="absolute" height={5} top={-5} width={1} boxShadow={theme.customShadows.widgetHeader} />
            {disabled ? <LinearProgress /> : null}
            <Box sx={{ px: 1, my: 1 }}>
                <Typography sx={{ mb: 2 }} variant={"h5"}>
                    Add comment
                </Typography>
                <form onSubmit={handleSubmit}>
                    <TextField
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        sx={{ mb: 1 }}
                        id={"topic-comment"}
                        label={"Comment"}
                        fullWidth
                        multiline
                        rows={4}
                    />

                    <IncludeViewpoint viewpoint={viewpoint} setViewpoint={setViewpoint} view={view} scene={scene} />

                    <Box display="flex" justifyContent="space-between" mr={2} mb={2}>
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
                            Add comment
                        </Button>
                    </Box>
                </form>
            </Box>
        </ScrollBox>
    );
}
