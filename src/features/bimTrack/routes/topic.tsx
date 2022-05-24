import { useParams, Link, useHistory } from "react-router-dom";
import { useTheme, Box, Button, Typography, List, ListItem } from "@mui/material";
import { Add, ArrowBack, Edit } from "@mui/icons-material";
import { HierarcicalObjectReference, Scene } from "@novorender/webgl-api";

import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    ImgModal,
    ImgTooltip,
    LinearProgress,
    ScrollBox,
    Tooltip,
    Divider,
} from "components";

import { useAppDispatch } from "app/store";
import { renderActions, ObjectVisibility, CameraType } from "slices/renderSlice";
import { useDispatchHidden, hiddenGroupActions } from "contexts/hidden";
import { useDispatchHighlighted, highlightActions } from "contexts/highlighted";
import { useDispatchVisible, visibleActions } from "contexts/visible";
import { useExplorerGlobals } from "contexts/explorerGlobals";

import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { useToggle } from "hooks/useToggle";
import { extractObjectIds } from "utils/objectData";
import { searchByPatterns } from "utils/search";
import { sleep } from "utils/timers";
import { translateBcfClippingPlanes, translateOrthogonalCamera, translatePerspectiveCamera } from "utils/bcf";
import type { Comment } from "types/bcf";

import {
    useGetTopicQuery,
    useGetCommentsQuery,
    useGetViewpointsQuery,
    useGetViewpointQuery,
    useGetSelectionQuery,
    useGetVisibilityQuery,
    useGetSnapshotQuery,
    useGetProjectExtensionsQuery,
} from "../bimTrackApi";

export function Topic() {
    const theme = useTheme();
    const history = useHistory();

    const [loading, setLoading] = useMountedState(false);
    const { projectId, topicId } = useParams<{ projectId: string; topicId: string }>();
    const [modalOpen, toggleModal] = useToggle();

    const { data: extensions } = useGetProjectExtensionsQuery({ projectId });
    const { data: topic } = useGetTopicQuery(
        { projectId, topicId },
        { refetchOnMountOrArgChange: true, refetchOnFocus: true }
    );
    const { data: comments } = useGetCommentsQuery(
        { projectId, topicId },
        { refetchOnMountOrArgChange: true, refetchOnFocus: true }
    );
    const { data: viewpoints } = useGetViewpointsQuery(
        {
            projectId,
            topicId: topic?.guid ?? "",
        },
        { skip: !topic || Boolean(topic.default_viewpoint_guid), refetchOnMountOrArgChange: true, refetchOnFocus: true }
    );

    const defaultViewpointId = topic?.default_viewpoint_guid
        ? topic.default_viewpoint_guid
        : viewpoints && viewpoints[0]
        ? viewpoints[0].guid
        : "";

    const { data: snapshot } = useGetSnapshotQuery(
        {
            projectId,
            topicId: topic?.guid ?? "",
            viewpointId: defaultViewpointId,
        },
        { skip: !topic || !defaultViewpointId }
    );

    if (!topic || !comments) {
        return <LinearProgress />;
    }

    const floatingViewpoints: Comment[] =
        viewpoints
            ?.filter((vp) => !comments.some((comment) => comment.viewpoint_guid === vp.guid))
            .map((floatingVp) => ({
                guid: "",
                date: topic.creation_date,
                author: topic.creation_author,
                modified_date: topic.modified_date,
                modified_author: topic.modified_author,
                comment: "No comment",
                topic_guid: topic.guid,
                viewpoint_guid: floatingVp.guid,
                reply_to_comment_guid: "",
                authorization: {
                    comment_actions: [],
                },
                extended_data: "",
                retrieved_on: "",
            })) || [];

    const topicActions = topic.authorization?.topic_actions ?? extensions?.topic_actions ?? [];
    const topicStatuses = topic.authorization?.topic_status ?? extensions?.topic_status ?? [];

    return (
        <>
            {loading ? <LinearProgress /> : null}
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Button onClick={() => history.goBack()} color="grey">
                    <ArrowBack sx={{ mr: 1 }} />
                    Back
                </Button>

                {topicActions.includes("createComment") ? (
                    <Button component={Link} to={`/project/${projectId}/topic/${topicId}/new-comment`} color="grey">
                        <Add sx={{ mr: 1 }} />
                        Add comment
                    </Button>
                ) : null}

                {topicStatuses.length ? (
                    <Button component={Link} to={`/project/${projectId}/topic/${topicId}/edit`} color="grey">
                        <Edit fontSize="small" sx={{ mr: 1 }} />
                        Edit
                    </Button>
                ) : null}
            </Box>
            <ScrollBox height={1} width={1} horizontal sx={{ mt: 1 }}>
                <Box p={1} sx={{ "& > img": { width: "100%", maxHeight: 150, objectFit: "cover", cursor: "pointer" } }}>
                    {snapshot ? <img onClick={toggleModal} src={snapshot} alt="" /> : null}
                    <Accordion>
                        <AccordionSummary>
                            <Typography variant="h6" fontWeight={600}>
                                {topic.title}
                            </Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ px: 1, pb: 2 }}>
                            <Typography sx={{ mb: 2 }} variant="h6">
                                {topic.description}
                            </Typography>
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="h6">Creator:</Typography>
                                <Typography variant="h6" fontWeight={600}>
                                    {topic.creation_author}
                                </Typography>
                            </Box>
                            <Divider sx={{ mt: 1.5, mb: 1, color: theme.palette.grey[200] }} />
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="h6">Status:</Typography>
                                <Typography variant="h6" fontWeight={600}>
                                    {topic.topic_status}
                                </Typography>
                            </Box>
                            <Divider sx={{ mt: 1.5, mb: 1, color: theme.palette.grey[200] }} />
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="h6">Type:</Typography>
                                <Typography variant="h6" fontWeight={600}>
                                    {topic.topic_type}
                                </Typography>
                            </Box>
                            <Divider sx={{ mt: 1.5, mb: 1, color: theme.palette.grey[200] }} />
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="h6">Priority:</Typography>
                                <Typography variant="h6" fontWeight={600}>
                                    {topic.priority}
                                </Typography>
                            </Box>
                            <Divider sx={{ mt: 1.5, mb: 1, color: theme.palette.grey[200] }} />
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="h6">Deadline:</Typography>
                                <Typography variant="h6" fontWeight={600}>
                                    {topic.due_date ? new Date(topic.due_date).toLocaleDateString("nb") : "Undecided"}
                                </Typography>
                            </Box>
                            <Divider sx={{ mt: 1.5, mb: 1, color: theme.palette.grey[200] }} />
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="h6">Labels:</Typography>
                                <Typography variant="h6" fontWeight={600}>
                                    {topic.labels.join(", ")}
                                </Typography>
                            </Box>
                        </AccordionDetails>
                    </Accordion>
                </Box>
                <List>
                    {floatingViewpoints.concat(comments).map((comment) => (
                        <CommentListItem
                            key={comment.guid}
                            comment={comment}
                            projectId={projectId}
                            topicId={topicId}
                            defaultViewpointId={defaultViewpointId}
                            loading={loading}
                            setLoading={setLoading}
                        />
                    ))}
                </List>
            </ScrollBox>
            <ImgModal src={snapshot ?? ""} open={modalOpen} onClose={toggleModal} />
        </>
    );
}

function CommentListItem({
    comment,
    projectId,
    topicId,
    defaultViewpointId,
    loading,
    setLoading,
}: {
    comment: Comment;
    projectId: string;
    topicId: string;
    defaultViewpointId: string;
    loading: boolean;
    setLoading: (loading: boolean) => void;
}) {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const dispatchVisible = useDispatchVisible();
    const {
        state: { scene },
    } = useExplorerGlobals(true);

    const [modalOpen, toggleModal] = useToggle();
    const viewpointId = comment.viewpoint_guid || defaultViewpointId || "";

    const { data: viewpoint } = useGetViewpointQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: selection } = useGetSelectionQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: visibility } = useGetVisibilityQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: snapshot } = useGetSnapshotQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });

    const has3dPos = Boolean(viewpoint?.perspective_camera || viewpoint?.orthogonal_camera);
    const [abortController] = useAbortController();

    const handleClick = async () => {
        if (!has3dPos) {
            return;
        }

        const abortSignal = abortController.current.signal;

        const visibilityExceptionGuids = visibility?.exceptions
            ?.map((exception) => exception.ifc_guid)
            .filter((exception) => exception) as string[];

        const getVisibilityExceptions = visibilityExceptionGuids.length
            ? guidsToIds({ scene, abortSignal, guids: visibilityExceptionGuids })
            : Promise.resolve([]);

        const selectionGuids = selection?.map((obj) => obj.ifc_guid).filter((selection) => selection) as string[];
        const getSelection = selectionGuids.length
            ? guidsToIds({ scene, abortSignal, guids: selectionGuids })
            : Promise.resolve([]);

        setLoading(true);

        const [visibilityExceptionIds, selectionIds] = await Promise.all([getVisibilityExceptions, getSelection]);

        setLoading(false);

        if (abortSignal.aborted) {
            return;
        }

        if (visibility?.default_visibility) {
            dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
            dispatchHidden(hiddenGroupActions.setIds(visibilityExceptionIds));
        } else {
            dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));
            dispatchHidden(hiddenGroupActions.setIds([]));
            dispatchVisible(visibleActions.set(visibilityExceptionIds));
        }

        dispatchHighlighted(highlightActions.setIds(selectionIds));

        if (viewpoint?.perspective_camera) {
            const camera = translatePerspectiveCamera(viewpoint.perspective_camera);

            dispatch(renderActions.setCamera({ type: CameraType.Flight, goTo: camera }));
        }

        if (viewpoint?.orthogonal_camera) {
            const camera = translateOrthogonalCamera(viewpoint.orthogonal_camera);

            dispatch(
                renderActions.setCamera({
                    type: CameraType.Orthographic,
                    params: {
                        kind: "ortho",
                        ...camera,
                    },
                })
            );
        }

        dispatch(renderActions.resetClippingBox());
        if (viewpoint?.clipping_planes?.length) {
            const planes = translateBcfClippingPlanes(viewpoint.clipping_planes);
            dispatch(renderActions.setClippingPlanes({ enabled: true, mode: "union", planes, baseW: planes[0][3] }));
        } else {
            dispatch(renderActions.setClippingPlanes({ enabled: false, planes: [] }));
        }
    };

    return (
        <>
            <ListItem sx={{ py: 0.5, px: 1 }} button onClick={handleClick} disabled={loading}>
                <Box width={1} maxHeight={80} display="flex" alignItems="flex-start" overflow="hidden">
                    <Box
                        sx={
                            has3dPos
                                ? {
                                      position: "relative",

                                      "&::before": {
                                          position: "absolute",
                                          top: 4,
                                          left: 4,
                                          content: "'3D'",
                                          borderRadius: "2px",
                                          px: 1,
                                          py: 0.5,
                                          backgroundColor: "primary.main",
                                          color: "common.white",
                                          fontSize: "10px",
                                          fontWeight: 600,
                                      },
                                  }
                                : undefined
                        }
                        bgcolor={theme.palette.grey[200]}
                        height={70}
                        width={100}
                        flexShrink={0}
                        flexGrow={0}
                    >
                        {snapshot ? (
                            <ImgTooltip
                                onTooltipClick={(e) => {
                                    e.stopPropagation();
                                    toggleModal();
                                }}
                                src={snapshot}
                            />
                        ) : null}
                    </Box>
                    <Box ml={1} flexDirection="column" flexGrow={1} width={0}>
                        <Tooltip disableInteractive title={comment.comment || "No comment"}>
                            <div>
                                <Typography noWrap variant="body1" sx={{ fontWeight: 600 }}>
                                    {comment.comment || "No comment"}
                                </Typography>
                                <Typography
                                    sx={{
                                        display: "--webkit-box",
                                        overflow: "hidden",
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: "vertical",
                                    }}
                                >
                                    Date: {new Date(comment.date).toLocaleString("nb")} <br />
                                    By: {comment.author}
                                </Typography>
                            </div>
                        </Tooltip>
                    </Box>
                </Box>
            </ListItem>
            <ImgModal open={modalOpen} onClose={toggleModal} src={snapshot ?? ""} />
        </>
    );
}

async function guidsToIds({ guids, scene, abortSignal }: { guids: string[]; scene: Scene; abortSignal: AbortSignal }) {
    let ids = [] as number[];

    const batchSize = 100;
    const batches = guids.reduce(
        (acc, guid) => {
            const lastBatch = acc.slice(-1)[0];

            if (lastBatch.length < batchSize) {
                lastBatch.push(guid);
            } else {
                acc.push([guid]);
            }

            return acc;
        },
        [[]] as string[][]
    );

    const concurrentRequests = 5;
    const callback = (refs: HierarcicalObjectReference[]) => (ids = ids.concat(extractObjectIds(refs)));
    for (let i = 0; i < batches.length / concurrentRequests; i++) {
        await Promise.all(
            batches.slice(i * concurrentRequests, i * concurrentRequests + concurrentRequests).map((batch) => {
                return searchByPatterns({
                    scene,
                    callback,
                    abortSignal,
                    searchPatterns: [
                        {
                            property: "guid",
                            value: batch,
                            exact: true,
                        },
                    ],
                }).catch(() => {});
            })
        );

        await sleep(1);
    }

    return ids;
}
