import { useParams, Link, useHistory } from "react-router-dom";
import {
    useTheme,
    Tooltip as MuiTooltip,
    Box,
    Button,
    Typography,
    List,
    ListItem,
    styled,
    tooltipClasses,
    TooltipProps,
} from "@mui/material";
import { css } from "@mui/styled-engine";
import { Add, ArrowBack } from "@mui/icons-material";
import { View, Scene } from "@novorender/webgl-api";

import { useAppDispatch } from "app/store";
import { LinearProgress, ScrollBox, Tooltip } from "components";
import { useDispatchHidden, hiddenGroupActions } from "contexts/hidden";
import { useDispatchHighlighted, highlightActions } from "contexts/highlighted";
import { renderActions, ObjectVisibility } from "slices/renderSlice";
import { useAbortController } from "hooks/useAbortController";
import { useMountedState } from "hooks/useMountedState";
import { extractObjectIds } from "utils/objectData";
import { searchByPatterns } from "utils/search";

import {
    useGetTopicQuery,
    useGetCommentsQuery,
    useGetViewpointsQuery,
    useGetThumbnailQuery,
    useGetViewpointQuery,
    useGetColoringQuery,
    useGetSelectionQuery,
    useGetVisibilityQuery,
} from "../bimCollabApi";
import type { Comment } from "../types";
import { translateBcfClippingPlanes, translatePerspectiveCamera } from "../utils";

export function Topic({ view, scene }: { view: View; scene: Scene }) {
    const theme = useTheme();
    const history = useHistory();
    const [loading, setLoading] = useMountedState(false);
    const { projectId, topicId } = useParams<{ projectId: string; topicId: string }>();

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
                <Box p={1} sx={{ "& > img": { width: "100%", maxHeight: 150, objectFit: "none" } }}>
                    {thumbnail ? <img src={thumbnail} alt="" /> : null}
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

    const viewpointId = comment.viewpoint_guid || defaultViewpointId || "";

    const { data: thumbnail } = useGetThumbnailQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: viewpoint } = useGetViewpointQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: _coloring } = useGetColoringQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId }); // TODO(OLA): fix
    const { data: selection } = useGetSelectionQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: visibility } = useGetVisibilityQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });

    const [abortController] = useAbortController();

    const handleClick = async () => {
        setLoading(true);
        dispatchHidden(hiddenGroupActions.setIds([]));
        dispatchHighlighted(highlightActions.setIds([]));

        const abortSignal = abortController.current.signal;
        const createSearch = async (guids: string[]) => {
            let ids = [] as number[];

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
                callbackInterval: 1000,
            });

            return ids;
        };

        if (visibility) {
            let ids = [] as number[];

            if (visibility.exceptions.length) {
                ids = await createSearch(visibility.exceptions.map((exception) => exception.ifc_guid));
            }

            if (visibility.default_visibility) {
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Neutral));
                dispatchHidden(hiddenGroupActions.add(ids));
            } else {
                dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));
                dispatchHighlighted(highlightActions.add(ids));
            }
        }

        if (selection && selection.length) {
            const ids = await createSearch(selection.map((obj) => obj.ifc_guid));
            dispatchHighlighted(highlightActions.add(ids));
        }

        if (viewpoint?.perspective_camera) {
            const camera = translatePerspectiveCamera(viewpoint?.perspective_camera);
            view.camera.controller.moveTo(camera.position, camera.rotation);
        }

        dispatch(renderActions.resetClippingPlanes());
        if (viewpoint?.clipping_planes?.length) {
            const planes = translateBcfClippingPlanes(viewpoint.clipping_planes);

            view.applySettings({ clippingVolume: { enabled: true, mode: "union", planes } });
        } else {
            view.applySettings({ clippingVolume: { enabled: false, mode: "union", planes: [] } });
        }

        setLoading(false);
    };

    return (
        <ListItem sx={{ py: 0.5, px: 1 }} button onClick={handleClick} disabled={loading}>
            <Box width={1} maxHeight={80} display="flex" alignItems="flex-start" overflow="hidden">
                <Box bgcolor={theme.palette.grey[200]} height={65} width={100} flexShrink={0} flexGrow={0}>
                    {thumbnail ? (
                        <ImgTooltip
                            placement="bottom-end"
                            title={
                                <Box sx={{ height: 176, width: 176, cursor: "pointer" }}>
                                    <Img alt="" src={thumbnail} />
                                </Box>
                            }
                        >
                            <Img alt="" height="32px" width="32px" src={thumbnail} />
                        </ImgTooltip>
                    ) : null}
                </Box>
                <Box ml={1} flexDirection="column" flexGrow={1} width={0}>
                    <Tooltip disableInteractive title={comment.comment || "No comment"}>
                        <div>
                            <Typography noWrap variant="body1" sx={{ fontWeight: 600 }}>
                                {comment.comment || "No comment"}
                            </Typography>
                            <Description>
                                {new Date(comment.date).toLocaleString("nb")} <br />
                                {comment.author}
                            </Description>
                        </div>
                    </Tooltip>
                </Box>
            </Box>
        </ListItem>
    );
}

const Description = styled(Typography)(
    () => css`
        display: --webkit-box;
        overflow: hidden;
        --webkit-line-clamp: 2;
        --webkit-box-orient: vertical;
    `
);

const ImgTooltip = styled(({ className, ...props }: TooltipProps) => (
    <MuiTooltip {...props} classes={{ popper: className }} />
))(
    ({ theme }) => css`
        & .${tooltipClasses.tooltip} {
            max-width: none;
            background: ${theme.palette.common.white};
            padding: ${theme.spacing(1)};
            border-radius: 4px;
            border: 1px solid ${theme.palette.grey.A400};
        }
    `
);

const Img = styled("img")(
    () => css`
        height: 100%;
        width: 100%;
        object-fit: cover;
        display: block;
    `
);
