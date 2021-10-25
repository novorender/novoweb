import { View } from "@novorender/webgl-api";
import { Box, Typography, useTheme, Button, FormControlLabel } from "@mui/material";
import { useParams, useHistory } from "react-router-dom";
import { FormEvent, useEffect, useState } from "react";

import { IosSwitch, LinearProgress, ScrollBox, TextField } from "components";
import { useToggle } from "hooks/useToggle";

import {
    useGetProjectExtensionsQuery,
    useGetProjectQuery,
    useCreateTopicMutation,
    useCreateCommentMutation,
    useCreateViewpointMutation,
} from "../bimCollabApi";
import { createBcfPerspectiveCamera } from "../utils";

export function CreateTopic({ view }: { view: View }) {
    const theme = useTheme();
    const history = useHistory();

    const { projectId } = useParams<{ projectId: string }>();
    const { data: project } = useGetProjectQuery({ projectId });
    const { data: extensions } = useGetProjectExtensionsQuery({ projectId });
    const [createTopic, { isLoading: creatingTopic }] = useCreateTopicMutation();
    const [createComment, { isLoading: creatingComment }] = useCreateCommentMutation();
    const [createViewpoint, { isLoading: creatingViewpoint }] = useCreateViewpointMutation();

    const [title, setTitle] = useState("");
    const [comment, setComment] = useState("");
    const [includeViewpoint, toggleIncludeViewpoint] = useToggle(true);
    const [snapshot, setSnapshot] = useState<string>("");

    useEffect(() => {
        if (includeViewpoint) {
            setSnapshot(createSnapshot());
        } else {
            setSnapshot("");
        }
    }, [includeViewpoint]);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!title) {
            return;
        }

        const topicRes = await createTopic({ projectId, title });

        if (!("data" in topicRes)) {
            return;
        }

        const topicId = topicRes.data.guid;

        if (includeViewpoint) {
            const viewpointRes = await createViewpoint({
                projectId,
                topicId,
                perspective_camera: createBcfPerspectiveCamera(view.camera),
                snapshot: { snapshot_type: "png", snapshot_data: snapshot.split(";base64,")[1] ?? "" },
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

    return (
        <ScrollBox py={1} height={1} position="relative">
            <Box position="absolute" height={5} top={-5} width={1} boxShadow={theme.customShadows.widgetHeader} />
            {disabled ? <LinearProgress /> : null}
            <Box sx={{ px: 1, my: 1 }}>
                <Typography sx={{ mb: 2 }} variant={"h5"}>
                    Create new issue
                </Typography>
                <form onSubmit={handleSubmit}>
                    <TextField
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        sx={{ mb: 1 }}
                        id={"topic-title"}
                        label={"Title"}
                        fullWidth
                        required
                    />

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

                    {snapshot ? (
                        <Box sx={{ img: { maxWidth: "100%", maxHeight: 150, objectFit: "contain" } }}>
                            <img alt="" src={snapshot} />
                        </Box>
                    ) : null}

                    <FormControlLabel
                        sx={{ mb: 2 }}
                        control={
                            <IosSwitch checked={includeViewpoint} color="primary" onChange={toggleIncludeViewpoint} />
                        }
                        label={<Box>Include viewpoint</Box>}
                    />

                    <Box display="flex" justifyContent="flex-end" mr={2} mb={2}>
                        <Button variant="contained" type="submit" disabled={disabled}>
                            Create issue
                        </Button>
                    </Box>
                </form>
            </Box>
        </ScrollBox>
    );
}

function createSnapshot(): string {
    const canvas = document.getElementById("main-canvas") as HTMLCanvasElement;

    if (!canvas) {
        return "";
    }

    const dist = document.createElement("canvas");
    const { width, height } = canvas;
    dist.height = height;
    dist.width = width;
    const ctx = dist.getContext("2d", { alpha: false, desynchronized: false })!;
    ctx.drawImage(canvas, 0, 0, width, height, 0, 0, width, height);
    return dist.toDataURL("image/png");
}
