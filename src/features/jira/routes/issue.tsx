import { useEffect, useState, Fragment } from "react";
import { Add, ArrowBack, FlightTakeoff } from "@mui/icons-material";
import { Box, Button, Typography, useTheme } from "@mui/material";
import { useHistory, useParams } from "react-router-dom";

import { Divider, LinearProgress, ScrollBox } from "components";
import { useAppSelector } from "app/store";
import { useSelectBookmark } from "features/bookmarks";
import { dataApi } from "app";

import { useGetIssueQuery, useGetPermissionsQuery } from "../jiraApi";
import { selectJiraProject } from "../jiraSlice";
import { format } from "date-fns";

export function Issue({ sceneId }: { sceneId: string }) {
    const theme = useTheme();
    const history = useHistory();
    const key = useParams<{ key: string }>().key;

    const project = useAppSelector(selectJiraProject);
    const [bookmarkId, setBookmarkId] = useState("");
    const selectBookmark = useSelectBookmark();
    const [loadingBookmark, setLoadingBookmark] = useState(false);

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
                    {permissions.includes("ADD_COMMENTS") && (
                        <Button onClick={() => history.push(`/createComment/${key}`)} color="grey">
                            <Add sx={{ mr: 1 }} />
                            Comment
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

            {(isLoadingIssue || loadingBookmark) && (
                <Box>
                    <LinearProgress />
                </Box>
            )}

            {isErrorIssue || (!isLoadingIssue && !issue) ? (
                <>An error occured while loading issue {key}</>
            ) : (
                issue && (
                    <ScrollBox p={1} pt={2} pb={3}>
                        <Typography variant="h6" fontWeight={600} mb={2}>
                            {issue.fields.summary}
                        </Typography>

                        <Typography fontWeight={600}>Description:</Typography>
                        <Box mb={2}>
                            {(issue.fields.description?.content ?? [])?.map((doc: any, idx: number) => {
                                if (doc.type === "paragraph") {
                                    return (
                                        <Typography key={idx}>
                                            {(doc.content ?? []).map((pc: any, pcIdx: number) => {
                                                if (pc.type === "text") {
                                                    return pc.text;
                                                } else if (pc.type === "hardBreak") {
                                                    return <br key={pcIdx} />;
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

                        <Typography fontWeight={600}>Comments:</Typography>
                        <Box>
                            {issue.fields.comment.comments.map((comment, idx, arr) => (
                                <Fragment key={comment.id}>
                                    <Box>
                                        <Typography component="em">
                                            {comment.author.displayName} -{" "}
                                            {format(new Date(comment.updated ?? comment.created), "dd.MM.yyyy - HH:mm")}
                                        </Typography>
                                        {(comment.body.content ?? [])?.map((doc: any, idx: number) => {
                                            if (doc.type === "paragraph") {
                                                return (
                                                    <Typography key={idx}>
                                                        {(doc.content ?? []).map((pc: any, pcIdx: number) => {
                                                            if (pc.type === "text") {
                                                                return pc.text;
                                                            } else if (pc.type === "hardBreak") {
                                                                return <br key={pcIdx} />;
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
                            ))}
                        </Box>
                    </ScrollBox>
                )
            )}
        </>
    );
}
