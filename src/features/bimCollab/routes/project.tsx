import { Fragment } from "react";
import { useParams, Link, useHistory } from "react-router-dom";
import { Add, ArrowBack, FilterAlt } from "@mui/icons-material";
import { Box, Button, Typography, List, ListItem, useTheme } from "@mui/material";

import { useAppSelector } from "app/store";
import { LinearProgress, ScrollBox, Divider, Tooltip, ImgTooltip } from "components";

import { useGetProjectQuery, useGetTopicsQuery, useGetViewpointsQuery, useGetThumbnailQuery } from "../bimCollabApi";
import { FilterKey, Filters, selectFilters, selectSpace } from "../bimCollabSlice";
import { Topic } from "../types";

function applyFilters(topics: Topic[], filters: Filters): Topic[] {
    return topics.reduce((result, topic) => {
        let include = true;

        (Object.entries(filters) as [FilterKey, string[]][]).forEach(([key, value]) => {
            if (include === false || !value.length) {
                return;
            }

            if (Array.isArray(topic[key])) {
                if (!value.some((val) => topic[key].includes(val))) {
                    include = false;
                }

                return;
            }

            if (!topic[key] && !value.includes("NOT_SET")) {
                include = false;
                return;
            }

            if (typeof topic[key] === "string" && !value.includes(topic[key] as string)) {
                include = false;
            }
        });

        return include ? result.concat(topic) : result;
    }, [] as Topic[]);
}

export function Project() {
    const theme = useTheme();
    const history = useHistory();
    const space = useAppSelector(selectSpace);
    const filters = useAppSelector(selectFilters);

    const { projectId } = useParams<{ projectId: string }>();
    const { data: project } = useGetProjectQuery({ projectId });
    const { data: topics = [] as Topic[], isLoading: loadingTopics } = useGetTopicsQuery(
        { projectId },
        { refetchOnFocus: true }
    );
    const filteredTopics = applyFilters(topics, filters);

    if (!project || loadingTopics) {
        return <LinearProgress />;
    }

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Button onClick={() => history.goBack()} color="grey">
                    <ArrowBack sx={{ mr: 1 }} />
                    Back
                </Button>
                {project.authorization.project_actions.includes("createTopic") ? (
                    <Button component={Link} to={`/project/${projectId}/new-topic`} color="grey">
                        <Add sx={{ mr: 1 }} />
                        Create new issue
                    </Button>
                ) : null}
                <Button component={Link} to={`/project/${projectId}/filter`} color="grey">
                    <FilterAlt sx={{ mr: 1 }} />
                    Filter issues
                </Button>
            </Box>
            <ScrollBox py={1} height={1}>
                <Box sx={{ px: 1, my: 1 }}>
                    <Typography sx={{ mb: 1 }} variant={"h5"}>
                        {space} - {project.name}
                    </Typography>
                    <Typography variant="body2">
                        Showing {filteredTopics.length} of {topics.length} issues
                    </Typography>
                </Box>
                <List>
                    {filteredTopics.map((topic, index, array) => (
                        <Fragment key={topic.guid}>
                            <TopicListItem topic={topic} projectId={projectId} />
                            {index !== array.length - 1 ? (
                                <Box my={0.5} component="li">
                                    <Divider />
                                </Box>
                            ) : null}
                        </Fragment>
                    ))}
                </List>
            </ScrollBox>
        </>
    );
}

function TopicListItem({ topic, projectId }: { topic: Topic; projectId: string }) {
    const theme = useTheme();

    const { data: viewpoints } = useGetViewpointsQuery(
        {
            projectId,
            topicId: topic.guid,
        },
        { skip: Boolean(topic.default_viewpoint_guid) }
    );
    const { data: thumbnail } = useGetThumbnailQuery(
        {
            projectId,
            topicId: topic.guid,
            viewpointId: topic.default_viewpoint_guid
                ? topic.default_viewpoint_guid
                : viewpoints && viewpoints[0]
                ? viewpoints[0].guid
                : "",
        },
        { skip: (!viewpoints || !viewpoints[0]) && !topic.default_viewpoint_guid }
    );

    return (
        <ListItem sx={{ py: 0.5, px: 1 }} button>
            <Box
                width={1}
                maxHeight={80}
                display="flex"
                alignItems="flex-start"
                overflow="hidden"
                sx={{ color: "text.primary", textDecoration: "none" }}
                component={Link}
                to={`/project/${projectId}/topic/${topic.guid}`}
            >
                <Box bgcolor={theme.palette.grey[200]} height={65} width={100} flexShrink={0} flexGrow={0}>
                    {thumbnail ? <ImgTooltip src={thumbnail} /> : null}
                </Box>
                <Box ml={1} flexDirection="column" flexGrow={1} width={0}>
                    <Tooltip disableInteractive title={topic.title}>
                        <div>
                            <Typography noWrap variant="body1" sx={{ fontWeight: 600 }}>
                                {topic.title}
                            </Typography>
                            <Typography
                                sx={{
                                    display: "--webkit-box",
                                    overflow: "hidden",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                }}
                            >
                                Priority: {topic.priority} <br />
                                Status: {topic.topic_status}
                            </Typography>
                        </div>
                    </Tooltip>
                </Box>
            </Box>
        </ListItem>
    );
}
