import { Add, ArrowBack, Edit } from "@mui/icons-material";
import { Box, Button, List, ListItem, Typography, useTheme } from "@mui/material";
import { ClippingMode } from "@novorender/api";
import { ObjectDB } from "@novorender/data-js-api";
import { HierarcicalObjectReference } from "@novorender/webgl-api";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useHistory, useParams } from "react-router-dom";

import { useAppDispatch } from "app/redux-store-interactions";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Divider,
    ImgModal,
    ImgTooltip,
    LinearProgress,
    ScrollBox,
    Tooltip,
} from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { hiddenActions, useDispatchHidden } from "contexts/hidden";
import { highlightActions, useDispatchHighlighted } from "contexts/highlighted";
import {
    GroupStatus,
    InternalTemporaryGroup,
    objectGroupsActions,
    useDispatchObjectGroups,
} from "contexts/objectGroups";
import { selectionBasketActions, useDispatchSelectionBasket } from "contexts/selectionBasket";
import { CameraType, ObjectVisibility, renderActions } from "features/render";
import { useAbortController } from "hooks/useAbortController";
import { useToggle } from "hooks/useToggle";
import type { Comment } from "types/bcf";
import { translateBcfClippingPlanes, translateOrthogonalCamera, translatePerspectiveCamera } from "utils/bcf";
import { hexToVec } from "utils/color";
import { extractObjectIds } from "utils/objectData";
import { searchByPatterns } from "utils/search";
import { sleep } from "utils/time";

import {
    useGetColoringQuery,
    useGetCommentsQuery,
    useGetProjectExtensionsQuery,
    useGetSelectionQuery,
    useGetSnapshotQuery,
    useGetThumbnailQuery,
    useGetTopicQuery,
    useGetViewpointQuery,
    useGetViewpointsQuery,
    useGetVisibilityQuery,
} from "../bimCollabApi";

export function Topic() {
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();

    const [loading, setLoading] = useState(false);
    const { projectId, topicId } = useParams<{ projectId: string; topicId: string }>();
    const [modalOpen, toggleModal] = useToggle();

    const { data: extensions } = useGetProjectExtensionsQuery({ projectId });
    const { data: topic } = useGetTopicQuery(
        { projectId, topicId },
        { refetchOnMountOrArgChange: true, refetchOnFocus: true },
    );
    const { data: comments } = useGetCommentsQuery(
        { projectId, topicId },
        { refetchOnMountOrArgChange: true, refetchOnFocus: true },
    );
    const { data: viewpoints } = useGetViewpointsQuery(
        {
            projectId,
            topicId: topic?.guid ?? "",
        },
        {
            skip: !topic || Boolean(topic.default_viewpoint_guid),
            refetchOnMountOrArgChange: true,
            refetchOnFocus: true,
        },
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
        { skip: !topic || !defaultViewpointId },
    );

    const { data: snapshot } = useGetSnapshotQuery(
        {
            projectId,
            topicId: topic?.guid ?? "",
            viewpointId: defaultViewpointId,
        },
        { skip: !topic || !defaultViewpointId || !modalOpen },
    );

    if (!topic || !comments) {
        return (
            <Box position="relative">
                <LinearProgress />
            </Box>
        );
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
                    {t("back")}
                </Button>

                {topicActions.includes("createComment") ? (
                    <Button component={Link} to={`/project/${projectId}/topic/${topicId}/new-comment`} color="grey">
                        <Add sx={{ mr: 1 }} />
                        {t("addComment")}
                    </Button>
                ) : null}

                {topicStatuses.length ? (
                    <Button component={Link} to={`/project/${projectId}/topic/${topicId}/edit`} color="grey">
                        <Edit fontSize="small" sx={{ mr: 1 }} />
                        {t("edit")}
                    </Button>
                ) : null}
            </Box>
            <ScrollBox height={1} width={1} horizontal sx={{ mt: 1 }}>
                <Box p={1} sx={{ "& > img": { width: "100%", maxHeight: 150, objectFit: "cover", cursor: "pointer" } }}>
                    {thumbnail ? <img onClick={() => toggleModal()} src={thumbnail} alt="" /> : null}
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
                                <Typography variant="h6">{t("creator")}</Typography>
                                <Typography variant="h6" fontWeight={600}>
                                    {topic.creation_author}
                                </Typography>
                            </Box>
                            <Divider sx={{ mt: 1.5, mb: 1, color: theme.palette.grey[200] }} />
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="h6">{t("statusName")}</Typography>
                                <Typography variant="h6" fontWeight={600}>
                                    {topic.topic_status}
                                </Typography>
                            </Box>
                            <Divider sx={{ mt: 1.5, mb: 1, color: theme.palette.grey[200] }} />
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="h6">{t("typeName")}</Typography>
                                <Typography variant="h6" fontWeight={600}>
                                    {topic.topic_type}
                                </Typography>
                            </Box>
                            <Divider sx={{ mt: 1.5, mb: 1, color: theme.palette.grey[200] }} />
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="h6">{t("priorityName")}</Typography>
                                <Typography variant="h6" fontWeight={600}>
                                    {topic.priority}
                                </Typography>
                            </Box>
                            <Divider sx={{ mt: 1.5, mb: 1, color: theme.palette.grey[200] }} />
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="h6">{t("deadline")}</Typography>
                                <Typography variant="h6" fontWeight={600}>
                                    {topic.due_date ? new Date(topic.due_date).toLocaleDateString("nb") : "Undecided"}
                                </Typography>
                            </Box>
                            <Divider sx={{ mt: 1.5, mb: 1, color: theme.palette.grey[200] }} />
                            <Box display="flex" justifyContent="space-between">
                                <Typography variant="h6">{t("labelsName")}</Typography>
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
            <ImgModal src={snapshot ?? ""} open={modalOpen} onClose={() => toggleModal()} />
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
    const dispatchSelectionBasket = useDispatchSelectionBasket();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const {
        state: { db },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();

    const [modalOpen, toggleModal] = useToggle();
    const viewpointId = comment.viewpoint_guid || defaultViewpointId || "";

    const { data: thumbnail } = useGetThumbnailQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: viewpoint } = useGetViewpointQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: coloring } = useGetColoringQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: selection } = useGetSelectionQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: visibility } = useGetVisibilityQuery({ projectId, topicId, viewpointId }, { skip: !viewpointId });
    const { data: snapshot } = useGetSnapshotQuery(
        { projectId, topicId, viewpointId },
        { skip: !viewpointId || !modalOpen },
    );

    const has3dPos = Boolean(viewpoint?.perspective_camera || viewpoint?.orthogonal_camera);
    const [abortController] = useAbortController();

    const handleClick = async () => {
        if (!has3dPos) {
            return;
        }

        const abortSignal = abortController.current.signal;

        const visibilityExceptionGuids = visibility?.exceptions
            ?.map((exception) => exception.ifc_guid)
            .filter((exception) => exception !== undefined) as string[];

        const getVisibilityExceptions = visibilityExceptionGuids.length
            ? guidsToIds({ db, abortSignal, guids: visibilityExceptionGuids })
            : Promise.resolve([]);

        const selectionGuids = selection
            ?.map((obj) => obj.ifc_guid)
            .filter((exception) => exception !== undefined) as string[];
        const getSelection = selectionGuids.length
            ? guidsToIds({ db, abortSignal, guids: selectionGuids })
            : Promise.resolve([]);

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
                              color: hexToVec(item.color, item.color.length === 8),
                              ids: await guidsToIds({ db, abortSignal, guids: item.components as string[] }),
                          })),
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
            dispatchHidden(hiddenActions.setIds(visibilityExceptionIds));
        } else {
            dispatch(renderActions.setDefaultVisibility(ObjectVisibility.Transparent));
            dispatchHidden(hiddenActions.setIds([]));
            dispatchSelectionBasket(selectionBasketActions.set(visibilityExceptionIds));
        }

        dispatchHighlighted(highlightActions.setIds(selectionIds));

        dispatchObjectGroups(objectGroupsActions.reset());
        if (colorGroups.length) {
            dispatchObjectGroups(
                objectGroupsActions.add(
                    colorGroups.map((item, index) => ({
                        id: `Temporary BIMcollab viewpoint group ${index}`,
                        ids: new Set(item.ids),
                        color: item.color,
                        status: GroupStatus.Selected,
                        grouping: InternalTemporaryGroup.BIMcollab,
                        name: `BIMcollab ${index + 1}`,
                        search: [],
                        includeDescendants: false,
                        opacity: 0,
                    })),
                ),
            );
        }

        if (viewpoint?.perspective_camera) {
            const camera = translatePerspectiveCamera(viewpoint.perspective_camera);

            dispatch(renderActions.setCamera({ type: CameraType.Pinhole, goTo: camera }));
        }

        if (viewpoint?.orthogonal_camera) {
            const camera = translateOrthogonalCamera(viewpoint.orthogonal_camera);

            dispatch(
                renderActions.setCamera({
                    type: CameraType.Orthographic,
                    goTo: camera,
                }),
            );
        }

        if (viewpoint?.clipping_planes?.length) {
            const planes = translateBcfClippingPlanes(viewpoint.clipping_planes);
            dispatch(
                renderActions.setClippingPlanes({
                    enabled: true,
                    mode: ClippingMode.union,
                    planes: planes.map((plane) => ({ normalOffset: plane, baseW: plane[3] })),
                }),
            );
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
                                    {t("dateName")}
                                    {new Date(comment.date).toLocaleString("nb")} <br />
                                    {t("by")}
                                    {comment.author}
                                </Typography>
                            </div>
                        </Tooltip>
                    </Box>
                </Box>
            </ListItem>
            <ImgModal open={modalOpen} onClose={() => toggleModal()} src={snapshot ?? ""} />
        </>
    );
}

async function guidsToIds({ guids, db, abortSignal }: { guids: string[]; db: ObjectDB; abortSignal: AbortSignal }) {
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
        [[]] as string[][],
    );

    const concurrentRequests = 5;
    const callback = (refs: HierarcicalObjectReference[]) => (ids = ids.concat(extractObjectIds(refs)));
    for (let i = 0; i < batches.length / concurrentRequests; i++) {
        await Promise.all(
            batches.slice(i * concurrentRequests, i * concurrentRequests + concurrentRequests).map((batch) => {
                return searchByPatterns({
                    db,
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
            }),
        );

        await sleep(1);
    }

    return ids;
}
