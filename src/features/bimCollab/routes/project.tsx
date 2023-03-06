import AutoSizer from "react-virtualized-auto-sizer";
import { CSSProperties, Fragment } from "react";
import { useParams, Link, useHistory } from "react-router-dom";
import { Add, ArrowBack, FilterAlt } from "@mui/icons-material";
import { Box, Button, Typography, ListItem, useTheme } from "@mui/material";
import { isAfter, isSameDay, parseISO } from "date-fns";
import { FixedSizeList } from "react-window";

import { useAppSelector } from "app/store";
import { LinearProgress, Tooltip, ImgTooltip, withCustomScrollbar, Divider } from "components";
import { Topic } from "types/bcf";

import {
    useGetProjectQuery,
    useGetTopicsQuery,
    useGetViewpointsQuery,
    useGetThumbnailQuery,
    useGetProjectExtensionsQuery,
} from "../bimCollabApi";
import {
    FilterType,
    Filters,
    selectFilters,
    FilterModifiers,
    FilterModifier,
    selectFilterModifiers,
} from "../bimCollabSlice";

const StyledFixedSizeList = withCustomScrollbar(FixedSizeList) as typeof FixedSizeList;

export function Project() {
    const theme = useTheme();
    const history = useHistory();
    const filters = useAppSelector(selectFilters);
    const filterModifiers = useAppSelector(selectFilterModifiers);

    const { projectId } = useParams<{ projectId: string }>();
    const { data: project } = useGetProjectQuery({ projectId });
    const { data: extensions } = useGetProjectExtensionsQuery({ projectId });
    const { data: topics = [] as Topic[], isLoading: loadingTopics } = useGetTopicsQuery(
        { projectId },
        { refetchOnFocus: true }
    );
    const filteredTopics = applyFilters(topics, filters, filterModifiers);

    if (!project || loadingTopics) {
        return (
            <Box position="relative">
                <LinearProgress />
            </Box>
        );
    }

    const projectActions = project.authorization?.project_actions ?? extensions?.project_actions ?? [];

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Button onClick={() => history.goBack()} color="grey">
                    <ArrowBack sx={{ mr: 1 }} />
                    Back
                </Button>
                {projectActions.includes("createTopic") ? (
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
            <Box py={1} height={1} display="flex" flexDirection="column">
                <Box sx={{ px: 1, my: 1 }}>
                    <Typography variant="body2">
                        Showing {filteredTopics.length} of {topics.length} issues
                    </Typography>
                </Box>
                <Box flex={"1 1 100%"}>
                    <AutoSizer>
                        {({ height, width }) => (
                            <StyledFixedSizeList
                                style={{ paddingLeft: theme.spacing(1), paddingRight: theme.spacing(1) }}
                                height={height}
                                width={width}
                                itemSize={80}
                                overscanCount={3}
                                itemCount={filteredTopics.length}
                            >
                                {({ index, style }) => {
                                    return (
                                        <TopicListItem
                                            topic={filteredTopics[index]}
                                            projectId={projectId}
                                            style={style}
                                        />
                                    );
                                }}
                            </StyledFixedSizeList>
                        )}
                    </AutoSizer>
                </Box>
            </Box>
        </>
    );
}

function TopicListItem({ topic, projectId, style }: { topic: Topic; projectId: string; style: CSSProperties }) {
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

    const has3dPos = Boolean(viewpoints?.filter((vp) => vp.perspective_camera || vp.orthogonal_camera).length);

    return (
        <ListItem style={style} sx={{ py: 0.5, px: 1 }} button>
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

function applyFilters(topics: Topic[], filters: Filters, filterModifiers: FilterModifiers): Topic[] {
    return topics.reduce((result, topic) => {
        let include = true;

        (Object.entries(filters) as [FilterType, string | string[]][]).forEach(([key, value]) => {
            if (include === false || !value.length) {
                return;
            }

            const filterIsArray = Array.isArray(value);

            if (key === FilterType.Deadline && !filterIsArray) {
                if (!topic[key]) {
                    include = false;
                    return;
                }

                const filterDeadline = parseISO(value);
                const topicDeadline = parseISO(topic[key]);
                const sameDay = isSameDay(filterDeadline, topicDeadline);
                switch (filterModifiers[FilterModifier.DeadlineOperator]) {
                    case "=": {
                        include = sameDay;
                        return;
                    }
                    case ">=": {
                        include = sameDay || isAfter(filterDeadline, topicDeadline);
                        return;
                    }
                    case "<=": {
                        include = sameDay || isAfter(topicDeadline, filterDeadline);
                        return;
                    }
                }
            }

            if (!filterIsArray) {
                return;
            }

            if (Array.isArray(topic[key])) {
                if (!value.some((val) => topic[key]!.includes(val))) {
                    include = false;
                }

                return;
            }

            if (!topic[key] && !value.includes("NOT_SET") && !value.includes("")) {
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
