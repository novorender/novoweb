import { useEffect, useState, Fragment } from "react";
import { AddCircle, ArrowBack, FlightTakeoff, OpenInNew } from "@mui/icons-material";
import { Box, Button, Typography, useTheme } from "@mui/material";
import { useHistory, useParams } from "react-router-dom";
import { format, parse } from "date-fns";

import { Divider, ImgModal, LinearProgress, ScrollBox } from "components";
import { useAppSelector } from "app/store";
import { useSelectBookmark } from "features/bookmarks";
import { dataApi } from "app";
import { useToggle } from "hooks/useToggle";

import {
    useGetAttachmentContentQuery,
    useGetAttachmentThumbnailQuery,
    useGetIssueQuery,
    useGetPermissionsQuery,
} from "../jiraApi";
import { selectJiraProject, selectJiraSpace } from "../jiraSlice";

export function Issue({ sceneId }: { sceneId: string }) {
    const theme = useTheme();
    const history = useHistory();
    const key = useParams<{ key: string }>().key;

    const space = useAppSelector(selectJiraSpace);
    const project = useAppSelector(selectJiraProject);
    const [bookmarkId, setBookmarkId] = useState("");
    const selectBookmark = useSelectBookmark();
    const [loadingBookmark, setLoadingBookmark] = useState(false);
    const [modalOpen, toggleModal] = useToggle();
    const [imageAttachmentId, setImageAttachmentId] = useState("");

    const {
        data: issue,
        isFetching: _isFetchingIssue,
        isLoading: isLoadingIssue,
        isError: isErrorIssue,
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

    const { data: thumbnail, isLoading: isLoadingThumbnail } = useGetAttachmentThumbnailQuery(
        { id: imageAttachmentId },
        { skip: !imageAttachmentId }
    );
    const { data: fullImage, isLoading: isLoadingFullImage } = useGetAttachmentContentQuery(
        { id: imageAttachmentId },
        { skip: !imageAttachmentId || !modalOpen }
    );

    useEffect(() => {
        if (!issue || imageAttachmentId) {
            return;
        }

        const nrImage = issue
            ? issue.fields.attachment.find((attachment) => attachment.filename === "Novorender model image")
            : undefined;

        if (nrImage) {
            setImageAttachmentId(nrImage.id);
        }
    }, [imageAttachmentId, issue]);

    useEffect(() => {
        if (!issue || bookmarkId) {
            return;
        }

        try {
            // todo aids
            const bmId = issue?.fields?.description?.content
                .find(
                    (c: any) =>
                        c.type === "heading" &&
                        c.content.find((hc: any) => hc.type === "text" && hc.text === "Novorender link")
                )
                ?.content.find((hc: any) => hc.type === "text" && hc.text === "Novorender link")
                .marks?.find((m: any) => m.attrs.href)
                ?.attrs.href.match(/bookmarkId=([\w\d-]{36})/)[1];

            if (bmId) {
                setBookmarkId(bmId);
            }
        } catch (e) {
            console.warn(e);
        }
    }, [bookmarkId, issue]);

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

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex" justifyContent="space-between">
                    <Button onClick={() => history.push("/issues")} color="grey">
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

                    {bookmarkId && (
                        <Button disabled={loadingBookmark} onClick={handleGoToBookmark} color="grey">
                            <FlightTakeoff sx={{ mr: 1 }} />
                            Go to
                        </Button>
                    )}
                </Box>
            </Box>

            {(isLoadingIssue || loadingBookmark || isLoadingFullImage || isLoadingThumbnail) && (
                <Box>
                    <LinearProgress />
                </Box>
            )}

            {(isErrorIssue && !issue) || (!isLoadingIssue && !issue) ? (
                <>An error occured while loading issue {key}</>
            ) : (
                issue &&
                !isLoadingThumbnail && (
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
                            {(issue.fields.description?.content ?? [])?.map((doc: any, idx: number) => {
                                if (doc.type === "paragraph") {
                                    return (
                                        <Typography mb={2} key={idx}>
                                            {(doc.content?.length ? doc.content : [{ type: "hardBreak" }]).map(
                                                (pc: any, pcIdx: number) => {
                                                    if (pc.type === "text") {
                                                        const link = pc.marks?.find(
                                                            (mark: any) => mark.type === "link"
                                                        );
                                                        if (link) {
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
                                              {(comment.body.content ?? [])?.map((doc: any, idx: number) => {
                                                  if (doc.type === "paragraph") {
                                                      return (
                                                          <Typography mb={2} key={idx}>
                                                              {(doc.content?.length
                                                                  ? doc.content
                                                                  : [{ type: "hardBreak" }]
                                                              ).map((pc: any, pcIdx: number) => {
                                                                  if (pc.type === "text") {
                                                                      const link = pc.marks?.find(
                                                                          (mark: any) => mark.type === "link"
                                                                      );
                                                                      if (link) {
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
                            open={modalOpen && !isLoadingFullImage}
                            onClose={toggleModal}
                        />
                    </ScrollBox>
                )
            )}
        </>
    );
}
