import { useStore } from "react-redux";
import { ObjectId, Scene, View } from "@novorender/webgl-api";
import { Box, Typography, useTheme, Button, FormControlLabel, CircularProgress } from "@mui/material";
import { useParams, useHistory } from "react-router-dom";
import { FormEvent, useEffect, useState } from "react";

import { ObjectVisibility, selectDefaultVisibility } from "slices/renderSlice";
import { useLazyHidden } from "contexts/hidden";
import { useLazyHighlighted } from "contexts/highlighted";
import { useLazyVisible } from "contexts/visible";
import { useLazyCustomGroups } from "contexts/customGroups";

import { IosSwitch, LinearProgress, ScrollBox, TextField } from "components";
import { useAbortController } from "hooks/useAbortController";
import { useToggle } from "hooks/useToggle";
import { useMountedState } from "hooks/useMountedState";
import { searchByPatterns } from "utils/search";
import { getGuids } from "utils/objectData";

import {
    useGetProjectExtensionsQuery,
    useGetProjectQuery,
    useCreateTopicMutation,
    useCreateCommentMutation,
    useCreateViewpointMutation,
} from "../bimCollabApi";
import {
    createBcfClippingPlanes,
    createBcfPerspectiveCamera,
    createBcfSnapshot,
    createBcfViewpointComponents,
} from "../utils";
import { Viewpoint } from "../types";

type NewViewpoint = Partial<Viewpoint> & Pick<Viewpoint, "perspective_camera" | "snapshot">;

export function CreateTopic({ view, scene }: { scene: Scene; view: View }) {
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
    const [viewpoint, setViewpoint] = useState<NewViewpoint>();

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
                            Create issue
                        </Button>
                    </Box>
                </form>
            </Box>
        </ScrollBox>
    );
}

export function IncludeViewpoint({
    viewpoint,
    setViewpoint,
    view,
    scene,
}: {
    scene: Scene;
    view: View;
    viewpoint: NewViewpoint | undefined;
    setViewpoint: (vp: NewViewpoint | undefined) => void;
}) {
    const hidden = useLazyHidden();
    const visible = useLazyVisible();
    const highlighted = useLazyHighlighted();
    const customGroups = useLazyCustomGroups();
    const store = useStore();

    const [includeViewpoint, toggleIncludeViewpoint] = useToggle(true);
    const [abortController, abort] = useAbortController();
    const [loading, setLoading] = useMountedState(false);

    useEffect(() => {
        if (includeViewpoint) {
            createNewViewpoint();
        } else {
            abort();
            setViewpoint(undefined);
        }

        async function createNewViewpoint() {
            const snapshot = createBcfSnapshot();

            if (!snapshot) {
                return;
            }

            setLoading(true);
            const abortSignal = abortController.current.signal;
            const state = store.getState();
            const defaultVisibility = selectDefaultVisibility(state);
            const getExceptions = idsToGuids(
                defaultVisibility === ObjectVisibility.Neutral ? hidden.current.idArr : visible.current.idArr
            );
            const getSelected = idsToGuids(highlighted.current.idArr);
            const getColoring = customGroups.current
                .filter((group) => group.selected)
                .map(async (group) => {
                    return { color: group.color, guids: await idsToGuids(group.ids) };
                });
            const [exceptions, selected, coloring] = await Promise.all([
                getExceptions,
                getSelected,
                Promise.all(getColoring),
            ]);

            setLoading(false);
            setViewpoint({
                snapshot,
                perspective_camera: createBcfPerspectiveCamera(view.camera),
                clipping_planes: createBcfClippingPlanes(view.settings.clippingVolume.planes),
                components: await createBcfViewpointComponents({
                    coloring,
                    selected,
                    defaultVisibility,
                    exceptions,
                }),
            });

            async function idsToGuids(ids: ObjectId[]): Promise<string[]> {
                if (!ids.length) {
                    return [];
                }

                let guids = [] as string[];

                try {
                    await searchByPatterns({
                        scene,
                        abortSignal,
                        full: true,
                        searchPatterns: [{ property: "id", value: ids as unknown as string[], exact: true }],
                        callback: async (refs) => {
                            const _guids = await getGuids(refs);
                            guids = guids.concat(_guids);
                        },
                    });
                } catch {
                    return guids;
                }

                return guids;
            }
        }
    }, [
        includeViewpoint,
        setViewpoint,
        view,
        store,
        hidden,
        visible,
        highlighted,
        scene,
        abortController,
        abort,
        setLoading,
        customGroups,
    ]);

    return (
        <>
            {viewpoint?.snapshot ? (
                <Box sx={{ img: { maxWidth: "100%", maxHeight: 150, objectFit: "contain" } }}>
                    <img
                        alt=""
                        src={`data:image/${viewpoint.snapshot.snapshot_type};base64,${viewpoint.snapshot.snapshot_data}`}
                    />
                </Box>
            ) : loading ? (
                <Box width={1} height={150} display="flex" justifyContent="center" alignItems="center">
                    <CircularProgress />
                </Box>
            ) : null}

            <FormControlLabel
                disabled={loading}
                sx={{ mb: 2 }}
                control={<IosSwitch checked={includeViewpoint} color="primary" onChange={toggleIncludeViewpoint} />}
                label={<Box>Include viewpoint</Box>}
            />
        </>
    );
}
