import { AddCircle, ArrowBack, Close, FlightTakeoff, OpenInNew, Room } from "@mui/icons-material";
import { Box, Button, IconButton, Snackbar, Typography, useTheme } from "@mui/material";
import { dataApi } from "apis/dataV1";
import { format, parse } from "date-fns";
import { Fragment, useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app";
import { Divider, ImgModal, LinearProgress, ScrollBox } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { useCreateBookmark } from "features/bookmarks/useCreateBookmark";
import { useSelectBookmark } from "features/bookmarks/useSelectBookmark";
import { useToggle } from "hooks/useToggle";
import { AsyncStatus } from "types/misc";
import { createCanvasSnapshot } from "utils/misc";
import { sleep } from "utils/time";

import {
    useAddAttachmentMutation,
    useEditIssueMutation,
    useGetAttachmentContentQuery,
    useGetAttachmentThumbnailQuery,
    useGetIssueQuery,
    useGetPermissionsQuery,
} from "../jiraApi";
import {
    jiraActions,
    selectJiraComponent,
    selectJiraProject,
    selectJiraSpace,
    selectMetaCustomfieldKey,
} from "../jiraSlice";
import { createIssueSnapshotAttachment, createLinkNode, getLinkNode } from "../utils";

export function Issue({ sceneId }: { sceneId: string }) {
    const theme = useTheme();
    const history = useHistory();
    const key = useParams<{ key: string }>().key;
    const {
        state: { canvas },
    } = useExplorerGlobals(true);

    const createBookmark = useCreateBookmark();
    const [editIssue] = useEditIssueMutation();
    const [addAttachment] = useAddAttachmentMutation();
    const dispatch = useAppDispatch();
    const space = useAppSelector(selectJiraSpace);
    const project = useAppSelector(selectJiraProject);
    const metaCustomfieldKey = useAppSelector(selectMetaCustomfieldKey);
    const component = useAppSelector(selectJiraComponent);
    const [bookmarkId, setBookmarkId] = useState("");
    const selectBookmark = useSelectBookmark();
    const [loadingBookmark, setLoadingBookmark] = useState(false);
    const [modalOpen, toggleModal] = useToggle();
    const [imageAttachmentId, setImageAttachmentId] = useState("");
    const [saveStatus, setSaveStatus] = useState(AsyncStatus.Initial);

    const {
        data: issue,
        isFetching: isFetchingIssue,
        isLoading: isLoadingIssue,
        isError: isErrorIssue,
        refetch: refetchIssue,
    } = useGetIssueQuery(
        {
            key,
        },
        { skip: !key, refetchOnMountOrArgChange: true }
    );

    const { data: permissions = [] } = useGetPermissionsQuery(
        {
            project: project?.key ?? "",
        },
        { skip: !project }
    );

    const { data: thumbnail, isFetching: isFetchingThumbnail } = useGetAttachmentThumbnailQuery(
        { id: imageAttachmentId },
        { skip: !imageAttachmentId }
    );
    const { data: fullImage, isFetching: isFetchingFullImage } = useGetAttachmentContentQuery(
        { id: imageAttachmentId },
        { skip: !imageAttachmentId || !modalOpen }
    );

    useEffect(() => {
        if (!issue) {
            return;
        }

        const nrImage = issue
            ? issue.fields.attachment.filter((attachment) => attachment.filename === "Novorender model image")[0]
            : undefined;

        if (nrImage) {
            setImageAttachmentId(nrImage.id);
        }
    }, [issue]);

    useEffect(() => {
        if (!issue?.fields?.description) {
            return;
        }

        try {
            const bmId = getLinkNode(issue.fields.description)
                ?.marks?.find((m) => m?.attrs?.href)
                ?.attrs?.href?.match(/bookmarkId=([\w\d-]{36})/);

            if (bmId && bmId[1]) {
                setBookmarkId(bmId[1]);
            }
        } catch (e) {
            console.warn(e);
        }
    }, [issue]);

    const handleGoToBookmark = async () => {
        if (!bookmarkId) {
            return;
        }

        setLoadingBookmark(true);

        try {
            const bookmark = (await dataApi.getBookmarks(sceneId, { group: bookmarkId })).find(
                (bm) => bm.id === bookmarkId
            );

            if (!bookmark) {
                return;
            }

            selectBookmark(bookmark);
        } catch (e) {
            console.warn(e);
        }

        setLoadingBookmark(false);
    };

    const handleThumbnailClick = async () => {
        toggleModal();
    };

    const handleUpdate = async () => {
        if (!component || !issue || saveStatus !== AsyncStatus.Initial) {
            return;
        }

        setSaveStatus(AsyncStatus.Loading);

        const bmId = window.crypto.randomUUID();
        const bm = createBookmark();
        const snapshot = await createCanvasSnapshot(canvas, 5000, 5000);
        const saved = await dataApi.saveBookmarks(sceneId, [{ ...bm, id: bmId, name: bmId }], { group: bmId });

        if (!saved) {
            setSaveStatus(AsyncStatus.Error);
            return;
        }

        const description = issue.fields.description
            ? structuredClone(issue.fields.description)
            : {
                  type: "doc",
                  version: 1,
                  content: [],
              };
        const linkNodeMark = getLinkNode(description)?.marks?.find((m) => m?.attrs?.href);

        if (linkNodeMark?.attrs) {
            linkNodeMark.attrs = { href: `${window.location.origin}${window.location.pathname}?bookmarkId=${bmId}` };
        } else {
            const content = description.content ?? [];
            content.push(createLinkNode(bmId));
            description.content = content;
        }

        const components = issue.fields.components
            ? issue.fields.components.find((c) => c.id === component.id)
                ? issue.fields.components.map((c) => ({ id: c.id }))
                : issue.fields.components.map((c) => ({ id: c.id })).concat({ id: component.id })
            : [{ id: component.id }];

        try {
            const res = await editIssue({
                key: issue.id,
                body: {
                    fields: {
                        description,
                        components,
                        ...(metaCustomfieldKey
                            ? { [metaCustomfieldKey]: JSON.stringify({ position: bm.explorerState?.camera.position }) }
                            : {}),
                    },
                },
            });

            if ("error" in res) {
                throw res.error;
            }

            if (snapshot) {
                await addAttachment({ issueId: issue.id, form: createIssueSnapshotAttachment(snapshot) });
                // Jira needs some time to generate thumbnail.
                await sleep(1000);
            }

            refetchIssue();
            setSaveStatus(AsyncStatus.Success);
        } catch (e) {
            console.warn(e);
            setSaveStatus(AsyncStatus.Error);
        }
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button
                        onClick={() => {
                            history.push("/issues");
                            dispatch(jiraActions.setActiveIssue(""));
                        }}
                        color="grey"
                    >
                        <ArrowBack sx={{ mr: 1 }} />
                        Back
                    </Button>
                    {space && (
                        <Button
                            disabled={!issue}
                            href={`${space.url}/browse/${issue?.key}`}
                            target="_blank"
                            color="grey"
                        >
                            <OpenInNew sx={{ mr: 1 }} />
                            Jira
                        </Button>
                    )}
                    <Button
                        disabled={
                            !issue ||
                            !component ||
                            !permissions.includes("EDIT_ISSUES") ||
                            saveStatus !== AsyncStatus.Initial
                        }
                        color="grey"
                        onClick={handleUpdate}
                    >
                        <Room sx={{ mr: 1 }} />
                        Set position
                    </Button>
                    {bookmarkId && (
                        <Button
                            disabled={loadingBookmark || saveStatus !== AsyncStatus.Initial}
                            onClick={handleGoToBookmark}
                            color="grey"
                        >
                            <FlightTakeoff sx={{ mr: 1 }} />
                            Go to
                        </Button>
                    )}
                </Box>
            </Box>

            {(isLoadingIssue ||
                isFetchingIssue ||
                loadingBookmark ||
                isFetchingFullImage ||
                isFetchingThumbnail ||
                saveStatus === AsyncStatus.Error) && (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            )}

            {(isErrorIssue && !issue) || (!isLoadingIssue && !issue) ? (
                <>An error occurred while loading issue {key}</>
            ) : (
                issue &&
                !isFetchingThumbnail && (
                    <ScrollBox p={1} pt={1} pb={4}>
                        {thumbnail && (
                            <Box
                                sx={{
                                    mb: 1,
                                    "& > img": {
                                        width: "100%",
                                        maxHeight: 150,
                                        objectFit: "cover",
                                        cursor: "pointer",
                                    },
                                }}
                            >
                                <img onClick={handleThumbnailClick} src={thumbnail} alt="" />
                            </Box>
                        )}
                        <Typography variant="h6" fontWeight={600} mb={2}>
                            {issue.fields.summary}
                        </Typography>

                        <Typography fontWeight={600}>Description:</Typography>
                        <Box mb={2}>
                            {(issue.fields.description?.content ?? [])?.map((doc, idx: number) => {
                                if (doc.type === "paragraph") {
                                    return (
                                        <Typography mb={2} key={idx}>
                                            {(doc.content?.length ? doc.content : [{ type: "hardBreak" }]).map(
                                                (pc, pcIdx: number) => {
                                                    if (pc.type === "text") {
                                                        const link = pc.marks?.find((mark) => mark?.type === "link");
                                                        if (link?.attrs?.href) {
                                                            return (
                                                                <a key={pcIdx} href={link.attrs.href} target="blank">
                                                                    {pc.text}
                                                                </a>
                                                            );
                                                        } else {
                                                            return pc.text;
                                                        }
                                                    } else if (pc.type === "hardBreak") {
                                                        return <br key={pcIdx} />;
                                                    } else if (pc.type === "mention" || pc.type === "emoji") {
                                                        return pc.attrs?.text ?? "";
                                                    } else {
                                                        return null;
                                                    }
                                                }
                                            )}
                                        </Typography>
                                    );
                                } else {
                                    return null;
                                }
                            })}
                        </Box>

                        <Typography fontWeight={600}>Status:</Typography>
                        <Box mb={2}>{issue.fields.status ? issue.fields.status.name : "None"}</Box>

                        <Typography fontWeight={600}>Assignee:</Typography>
                        <Box mb={2}>{issue.fields.assignee ? issue.fields.assignee.displayName : "Unassigned"}</Box>

                        <Typography fontWeight={600}>Reporter:</Typography>
                        <Box mb={2}>{issue.fields.reporter ? issue.fields.reporter.displayName : "None"}</Box>

                        {issue.fields.duedate && (
                            <>
                                <Typography fontWeight={600}>Due date:</Typography>
                                <Box mb={2}>
                                    {issue.fields.duedate
                                        ? format(parse(issue.fields.duedate, "yyyy-MM-dd", new Date()), "MMM dd, yyyy")
                                        : "None"}
                                </Box>
                            </>
                        )}

                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography fontWeight={600}>Comments:</Typography>
                            {permissions.includes("ADD_COMMENTS") && (
                                <Button onClick={() => history.push(`/createComment/${key}`)} color="grey">
                                    <AddCircle sx={{ mr: 1 }} />
                                    Add
                                </Button>
                            )}
                        </Box>
                        <Box>
                            {issue.fields.comment.comments.length
                                ? issue.fields.comment.comments.map((comment, idx, arr) => (
                                      <Fragment key={comment.id}>
                                          <Box>
                                              <Typography component="em">
                                                  {comment.author.displayName} -{" "}
                                                  {format(
                                                      new Date(comment.updated ?? comment.created),
                                                      "dd.MM.yyyy - HH:mm"
                                                  )}
                                              </Typography>
                                              {(comment.body.content ?? [])?.map((doc, idx: number) => {
                                                  if (doc.type === "paragraph") {
                                                      return (
                                                          <Typography mb={2} key={idx}>
                                                              {(doc.content?.length
                                                                  ? doc.content
                                                                  : [{ type: "hardBreak" }]
                                                              ).map((pc, pcIdx: number) => {
                                                                  if (pc.type === "text") {
                                                                      const link = pc.marks?.find(
                                                                          (mark) => mark.type === "link"
                                                                      );
                                                                      if (link?.attrs?.href) {
                                                                          return (
                                                                              <a
                                                                                  key={pcIdx}
                                                                                  href={link.attrs.href}
                                                                                  target="blank"
                                                                              >
                                                                                  {pc.text}
                                                                              </a>
                                                                          );
                                                                      } else {
                                                                          return pc.text;
                                                                      }
                                                                  } else if (pc.type === "hardBreak") {
                                                                      return <br key={pcIdx} />;
                                                                  } else if (
                                                                      pc.type === "mention" ||
                                                                      pc.type === "emoji"
                                                                  ) {
                                                                      return pc.attrs?.text ?? "";
                                                                  } else {
                                                                      return null;
                                                                  }
                                                              })}
                                                          </Typography>
                                                      );
                                                  } else {
                                                      return null;
                                                  }
                                              })}
                                          </Box>
                                          {idx !== arr.length - 1 ? <Divider sx={{ my: 0.5 }} /> : null}
                                      </Fragment>
                                  ))
                                : "No comments"}
                        </Box>
                        <ImgModal
                            src={fullImage ?? thumbnail ?? ""}
                            open={modalOpen && !isFetchingFullImage}
                            onClose={() => toggleModal()}
                        />
                    </ScrollBox>
                )
            )}
            {saveStatus === AsyncStatus.Error ? (
                <Snackbar
                    anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
                    sx={{
                        width: { xs: "auto", sm: 350 },
                        bottom: { xs: "auto", sm: 24 },
                        top: { xs: 24, sm: "auto" },
                    }}
                    autoHideDuration={2500}
                    open={saveStatus === AsyncStatus.Error}
                    onClose={() => setSaveStatus(AsyncStatus.Initial)}
                    message={"An error occurred while updating issue."}
                    action={
                        <IconButton
                            size="small"
                            aria-label="close"
                            color="inherit"
                            onClick={() => setSaveStatus(AsyncStatus.Initial)}
                        >
                            <Close fontSize="small" />
                        </IconButton>
                    }
                />
            ) : null}
        </>
    );
}
