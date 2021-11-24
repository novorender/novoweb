import { useStore } from "react-redux";
import { ObjectId } from "@novorender/webgl-api";
import {
    Box,
    Typography,
    useTheme,
    Button,
    FormControlLabel,
    CircularProgress,
    FormControl,
    InputLabel,
    MenuItem,
    OutlinedInput,
    Select,
} from "@mui/material";
import { useParams, useHistory } from "react-router-dom";
import { FormEvent, useEffect, useState } from "react";

import { ObjectVisibility, selectDefaultVisibility } from "slices/renderSlice";
import { useLazyHidden } from "contexts/hidden";
import { useLazyHighlighted } from "contexts/highlighted";
import { useLazyVisible } from "contexts/visible";
import { useLazyCustomGroups } from "contexts/customGroups";
import { useExplorerGlobals } from "contexts/explorerGlobals";

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
    createPerspectiveCamera,
    createBcfSnapshot,
    createBcfViewpointComponents,
    createOrthogonalCamera,
} from "../utils";
import { Viewpoint } from "../types";
import { DatePicker } from "@mui/lab";

type BaseViewpoint = Partial<Viewpoint> & Pick<Viewpoint, "snapshot">;
export type NewViewpoint = BaseViewpoint &
    (Pick<Viewpoint, "perspective_camera"> | Pick<Viewpoint, "orthogonal_camera">);

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
    const areas = extensions.fields.find((field) => field.field === "area")?.values.filter((field) => field.is_active);

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
                        name="title"
                        value={title}
                        onChange={(e) => handleInputChange(e.target)}
                        sx={{ mb: 1 }}
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
                                handleInputChange({ name: "deadline", value: newDate?.toISOString() ?? "" })
                            }
                            renderInput={(params) => <TextField {...params} size="small" />}
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
                            onChange={(e) => handleInputChange(e.target)}
                            input={<OutlinedInput label="Label" />}
                            name={"labels"}
                        >
                            {extensions.topic_label.map((topicLabel) => (
                                <MenuItem
                                    key={topicLabel}
                                    value={topicLabel}
                                    sx={{
                                        fontWeight: labels.includes(topicLabel) ? "bold" : "regular",
                                    }}
                                >
                                    {topicLabel}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <IncludeViewpoint viewpoint={viewpoint} setViewpoint={setViewpoint} />

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
}: {
    viewpoint: NewViewpoint | undefined;
    setViewpoint: (vp: NewViewpoint | undefined) => void;
}) {
    const hidden = useLazyHidden();
    const visible = useLazyVisible();
    const highlighted = useLazyHighlighted();
    const customGroups = useLazyCustomGroups();
    const {
        state: { view, scene, canvas },
    } = useExplorerGlobals(true);
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
            const snapshot = createBcfSnapshot(canvas);

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

            const baseVp: BaseViewpoint = {
                snapshot,
                clipping_planes: createBcfClippingPlanes(view.settings.clippingVolume.planes),
                components: await createBcfViewpointComponents({
                    coloring,
                    selected,
                    defaultVisibility,
                    exceptions,
                }),
            };

            if (view.camera.kind === "orthographic") {
                setViewpoint({ ...baseVp, orthogonal_camera: createOrthogonalCamera(view.camera) });
            } else if (view.camera.kind === "pinhole") {
                setViewpoint({ ...baseVp, perspective_camera: createPerspectiveCamera(view.camera) });
            }

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
        canvas,
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
