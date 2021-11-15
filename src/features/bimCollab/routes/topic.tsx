import { useParams, Link, useHistory } from "react-router-dom";
import { useTheme, Box, Button, Typography, List, ListItem } from "@mui/material";
import { Add, ArrowBack } from "@mui/icons-material";
import { View, Scene } from "@novorender/webgl-api";
import { vec3, quat } from "gl-matrix";

import { ImgModal, ImgTooltip, LinearProgress, ScrollBox, Tooltip } from "components";

import { useAppDispatch } from "app/store";
import { renderActions, ObjectVisibility } from "slices/renderSlice";
import { useDispatchHidden, hiddenGroupActions } from "contexts/hidden";
import { useDispatchHighlighted, highlightActions } from "contexts/highlighted";
import { useDispatchVisible, visibleActions } from "contexts/visible";
import { customGroupsActions, TempGroup, useCustomGroups } from "contexts/customGroups";

import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { useToggle } from "hooks/useToggle";
import { extractObjectIds } from "utils/objectData";
import { searchByPatterns } from "utils/search";
import { hexToVec } from "utils/color";

import {
    useGetTopicQuery,
    useGetCommentsQuery,
    useGetViewpointsQuery,
    useGetThumbnailQuery,
    useGetViewpointQuery,
    useGetColoringQuery,
    useGetSelectionQuery,
    useGetVisibilityQuery,
    useGetSnapshotQuery,
} from "../bimCollabApi";
import type { Comment } from "../types";
import { translateBcfClippingPlanes, translatePerspectiveCamera } from "../utils";

export function Topic({ view, scene }: { view: View; scene: Scene }) {
    const theme = useTheme();
    const history = useHistory();
    const [loading, setLoading] = useMountedState(false);
    const { projectId, topicId } = useParams<{ projectId: string; topicId: string }>();
    const [modalOpen, toggleModal] = useToggle();

    const { data: topic } = useGetTopicQuery({ projectId, topicId }, { refetchOnMountOrArgChange: true });
    const { data: comments } = useGetCommentsQuery({ projectId, topicId }, { refetchOnMountOrArgChange: true });
    const { data: viewpoints } = useGetViewpointsQuery(
        {
            projectId,
            topicId: topic?.guid ?? "",
        },
        { skip: !topic || Boolean(topic.default_viewpoint_guid), refetchOnMountOrArgChange: true }
    );

    const defaultViewpointId = topic?.default_viewpoint_guid
        ? topic.default_viewpoint_guid
        : viewpoints && viewpoints[0]
        ? viewpoints[0].guid
        : "";

    const { data: thumbnail } = useGetThumbnailQuery(
        {
            projectId,
            topicId: topic?.guid ?? "",
            viewpointId: defaultViewpointId,
        },
        { skip: !topic || !defaultViewpointId }
    );

    const { data: snapshot } = useGetSnapshotQuery(
        {
            projectId,
            topicId: topic?.guid ?? "",
            viewpointId: defaultViewpointId,
        },
        { skip: !topic || !defaultViewpointId || !modalOpen }
    );

    if (!topic || !comments) {
        return <LinearProgress />;
    }

    return (
        <>
            {loading ? <LinearProgress /> : null}
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Button onClick={() => history.goBack()} color="grey">
                    <ArrowBack sx={{ mr: 1 }} />
                    Back
                </Button>

                {topic.authorization.topic_actions.includes("createComment") ? (
                    <Button component={Link} to={`/project/${projectId}/topic/${topicId}/new-comment`} color="grey">
                        <Add sx={{ mr: 1 }} />
                        Add comment
                    </Button>
                ) : null}
            </Box>
            <ScrollBox height={1} width={1} horizontal sx={{ mt: 1 }}>
                <Box p={1} sx={{ "& > img": { width: "100%", maxHeight: 150, objectFit: "none", cursor: "pointer" } }}>
                    {thumbnail ? <img onClick={toggleModal} src={thumbnail} alt="" /> : null}
                    <Typography variant="h5">{topic.title}</Typography>
                    <Typography variant="h6">{topic.description}</Typography>
                    <br />
                    <Typography variant="h6">{topic.creation_author}</Typography>
                    <Typography variant="h6">
                        {topic.topic_status}, {topic.topic_type}, {topic.priority}
                    </Typography>
                    <Typography variant="h6">
                        {topic.due_date ? new Date(topic.due_date).toLocaleString("nb") : "Undecided"}
                    </Typography>
                    <Typography variant="h6">{topic.labels.join(", ")}</Typography>
                </Box>
                <List>
                    {comments.map((comment) => (
                        <CommentListItem
                            key={comment.guid}
                            comment={comment}
                            projectId={projectId}
                            topicId={topicId}
                            defaultViewpointId={defaultViewpointId}
                            view={view}
                            scene={scene}
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
    view,
    scene,
    loading,
    setLoading,
}: {
    comment: Comment;
    projectId: string;
    topicId: string;
    defaultViewpointId: string;
    view: View;
    scene: Scene;
    loading: boolean;
    setLoading: (loading: boolean) => void;
}) {
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const dispatchHighlighted = useDispatchHighlighted();
    const dispatchHidden = useDispatchHidden();
    const dispatchVisible = useDispatchVisible();
    const { dispatch: dispatchCustomGroups } = useCustomGroups();

    const [modalOpen, toggleModal] = useToggle();
    const viewpointId = comment.viewpoint_guid || defaultViewpointId || "";

    const { data: thumbnail } = useGetThumbnailQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: viewpoint } = useGetViewpointQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: coloring } = useGetColoringQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: selection } = useGetSelectionQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: visibility } = useGetVisibilityQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: snapshot } = useGetSnapshotQuery(
        { projectId, topicId, viewpointId },
        { skip: !viewpointId || !modalOpen }
    );

    const [abortController] = useAbortController();

    const handleClick = async () => {
        const abortSignal = abortController.current.signal;
        const guidsToIds = async (guids: string[]) => {
            let ids = [] as number[];

            try {
                await searchByPatterns({
                    scene,
                    searchPatterns: [
                        {
                            property: "guid",
                            value: guids,
                            exact: true,
                        },
                    ],
                    abortSignal,
                    callback: (refs) => (ids = ids.concat(extractObjectIds(refs))),
                });
            } catch {
                return ids;
            }

            return ids;
        };

        const visibilityExceptionGuids = visibility?.exceptions
            ?.map((exception) => exception.ifc_guid)
            .filter((exception) => exception !== undefined) as string[];

        const getVisibilityExceptions = visibilityExceptionGuids.length
            ? guidsToIds(visibilityExceptionGuids)
            : Promise.resolve([]);

        const selectionGuids = selection
            ?.map((obj) => obj.ifc_guid)
            .filter((exception) => exception !== undefined) as string[];
        const getSelection = selectionGuids.length ? guidsToIds(selectionGuids) : Promise.resolve([]);

        const getColorGroups =
            coloring && coloring.length
                ? Promise.all(
                      coloring
                          .map((item) => ({
                              ...item,
                              components: item.components
                                  .map((component) => component.ifc_guid)
                                  .filter((guid) => guid !== undefined),
                          }))
                          .filter((item) => item.components.length)
                          .map(async (item) => ({
                              color: hexToVec(item.color),
                              ids: await guidsToIds(item.components as string[]),
                          }))
                  )
                : Promise.resolve([]);

        setLoading(true);

        const [visibilityExceptionIds, selectionIds, colorGroups] = await Promise.all([
            getVisibilityExceptions,
            getSelection,
            getColorGroups,
        ]);

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

        dispatchCustomGroups(customGroupsActions.clearTempGroups());
        if (colorGroups.length) {
            dispatchCustomGroups(
                customGroupsActions.add(
                    colorGroups.map((item, index) => ({
                        id: `Temporary BIMcollab viewpoint group ${index}`,
                        ids: item.ids,
                        color: item.color,
                        selected: true,
                        hidden: false,
                        grouping: TempGroup.BIMcollab,
                        name: `BIMcollab ${index + 1}`,
                    }))
                )
            );
        }

        if (viewpoint?.perspective_camera) {
            const camera = translatePerspectiveCamera(viewpoint?.perspective_camera);
            const currentCamera = view.camera;

            if (
                !(
                    vec3.equals(camera.position, currentCamera.position) &&
                    quat.equals(camera.rotation, currentCamera.rotation)
                )
            ) {
                view.camera.controller.moveTo(camera.position, camera.rotation);
            }
        }

        dispatch(renderActions.resetClippingPlanes());
        if (viewpoint?.clipping_planes?.length) {
            const planes = translateBcfClippingPlanes(viewpoint.clipping_planes);

            view.applySettings({ clippingVolume: { enabled: true, mode: "union", planes } });
        } else {
            view.applySettings({ clippingVolume: { enabled: false, mode: "union", planes: [] } });
        }
    };

    return (
        <>
            <ListItem sx={{ py: 0.5, px: 1 }} button onClick={handleClick} disabled={loading}>
                <Box width={1} maxHeight={80} display="flex" alignItems="flex-start" overflow="hidden">
                    <Box bgcolor={theme.palette.grey[200]} height={65} width={100} flexShrink={0} flexGrow={0}>
                        {thumbnail ? (
                            <ImgTooltip
                                onTooltipClick={(e) => {
                                    e.stopPropagation();
                                    toggleModal();
                                }}
                                src={thumbnail}
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
                                    {new Date(comment.date).toLocaleString("nb")} <br />
                                    {comment.author}
                                </Typography>
                            </div>
                        </Tooltip>
                    </Box>
                </Box>
            </ListItem>
            <ImgModal
                open={modalOpen}
                onClose={toggleModal}
                sx={{ display: "flex", justifyContent: "center", alignItems: "center" }}
                src={snapshot ?? ""}
            />
        </>
    );
}
