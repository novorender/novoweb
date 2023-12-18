import { FilterAlt } from "@mui/icons-material";
import { Box, Button, FormControlLabel, ListItemButton, Typography, useTheme } from "@mui/material";
import { useEffect, useRef } from "react";
import { Link, Redirect, useHistory } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, FixedSizeVirualizedList, ImgTooltip, IosSwitch, LinearProgress, Tooltip } from "components";
import { featuresConfig } from "config/features";
import { FormattedText } from "features/ditio/formattedText";
import { selectHasAdminCapabilities } from "slices/explorerSlice";

import { baseUrl, useFeedWebRawQuery } from "../../api";
import {
    ditioActions,
    initialFilters,
    selectDitioProjects,
    selectFeedScrollOffset,
    selectFilters,
    selectShowDitioFeedMarkers,
    selectShowDitioMachineMarkers,
} from "../../slice";

export function Feed() {
    const theme = useTheme();
    const history = useHistory();

    const dispatch = useAppDispatch();
    const showFeedMarkers = useAppSelector(selectShowDitioFeedMarkers);
    const showMachineMarkers = useAppSelector(selectShowDitioMachineMarkers);
    const feedScrollOffset = useAppSelector(selectFeedScrollOffset);
    const filters = useAppSelector(selectFilters);
    const isAdmin = useAppSelector(selectHasAdminCapabilities);

    const projects = useAppSelector(selectDitioProjects);
    const { data: feed, isLoading } = useFeedWebRawQuery({ projects, filters }, { skip: !projects.length });

    const scrollPos = useRef(feedScrollOffset);

    useEffect(() => {
        dispatch(ditioActions.setFeedInitialized(true));

        return () => {
            dispatch(ditioActions.setFeedScrollOffset(scrollPos.current));
        };
    }, [dispatch]);

    if (!projects.length) {
        if (isAdmin) {
            return <Redirect to="/settings" />;
        } else {
            return (
                <>
                    <Box
                        boxShadow={(theme) => theme.customShadows.widgetHeader}
                        sx={{ height: 5, width: 1, mt: "-5px" }}
                        position="absolute"
                    />
                    <Typography p={1}>{featuresConfig.ditio.name} has not been set up for this project.</Typography>
                </>
            );
        }
    }

    const filtersEnabled = Object.keys(filters).some((_key) => {
        const key = _key as keyof typeof filters;
        return filters[key] !== initialFilters[key];
    });

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex" justifyContent={"space-between"}>
                        <Button component={Link} to={`/feed/filters`} color="grey">
                            <FilterAlt sx={{ mr: 1 }} />
                            Filters
                        </Button>
                        <FormControlLabel
                            control={
                                <IosSwitch
                                    size="medium"
                                    color="primary"
                                    checked={showFeedMarkers}
                                    onChange={() => dispatch(ditioActions.toggleShowFeedMarkers())}
                                />
                            }
                            label={
                                <Box fontSize={14} sx={{ userSelect: "none" }}>
                                    Feed
                                </Box>
                            }
                        />
                        <FormControlLabel
                            control={
                                <IosSwitch
                                    size="medium"
                                    color="primary"
                                    checked={showMachineMarkers}
                                    onChange={() => dispatch(ditioActions.toggleShowMachineMarkers())}
                                />
                            }
                            label={
                                <Box fontSize={14} sx={{ userSelect: "none" }}>
                                    Machines
                                </Box>
                            }
                        />
                    </Box>
                </>
            </Box>
            {isLoading ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : !feed ? (
                <Typography p={1}>Unable to load feed.</Typography>
            ) : !feed.length ? (
                <Box flex={"1 1 100%"}>
                    <Box
                        width={1}
                        mt={4}
                        display="flex"
                        justifyContent="center"
                        alignItems="center"
                        flexDirection="column"
                    >
                        Found no posts
                        {filtersEnabled ? (
                            <Button
                                sx={{ mt: 2 }}
                                variant="contained"
                                onClick={() => dispatch(ditioActions.resetFilters())}
                            >
                                Reset filters
                            </Button>
                        ) : null}
                    </Box>
                </Box>
            ) : (
                <Box flex={"1 1 100%"}>
                    <AutoSizer>
                        {({ height, width }) => (
                            <FixedSizeVirualizedList
                                style={{ paddingLeft: theme.spacing(1), paddingRight: theme.spacing(1) }}
                                height={height}
                                width={width}
                                itemSize={80}
                                overscanCount={3}
                                itemCount={feed.length}
                                initialScrollOffset={feedScrollOffset}
                                onScroll={(e) => {
                                    scrollPos.current = e.scrollOffset;
                                }}
                            >
                                {({ index, style }) => {
                                    const post = feed[index];

                                    return (
                                        <ListItemButton style={style} sx={{ py: 0.5, px: 1 }}>
                                            <Box
                                                width={1}
                                                maxHeight={80}
                                                display="flex"
                                                alignItems="flex-start"
                                                overflow="hidden"
                                                sx={{ color: "text.primary", textDecoration: "none" }}
                                                onClick={() => {
                                                    history.push(`/feed/post/${post.id}`);
                                                    dispatch(ditioActions.setActivePost(post.id));
                                                }}
                                                onMouseEnter={() => {
                                                    dispatch(
                                                        ditioActions.setHoveredEntity({ kind: "post", id: post.id })
                                                    );
                                                }}
                                                onMouseLeave={() => {
                                                    dispatch(ditioActions.setHoveredEntity(undefined));
                                                }}
                                            >
                                                <Box
                                                    bgcolor={theme.palette.grey[200]}
                                                    height={70}
                                                    width={100}
                                                    flexShrink={0}
                                                    flexGrow={0}
                                                >
                                                    {post.fileIds.length ? (
                                                        <ImgTooltip
                                                            src={`${baseUrl}/api/file/${post.fileIds[0]}?MaxDimension=300`}
                                                        />
                                                    ) : null}
                                                </Box>
                                                <Tooltip
                                                    disableInteractive
                                                    title={
                                                        <>
                                                            <Typography noWrap variant="body1" sx={{ fontWeight: 600 }}>
                                                                {post.isAlert ? (
                                                                    <Box component="span" color="red">
                                                                        !{" "}
                                                                    </Box>
                                                                ) : null}
                                                                {post.taskDescription}
                                                            </Typography>
                                                            <FormattedText str={post.text} />
                                                        </>
                                                    }
                                                >
                                                    <Box
                                                        ml={1}
                                                        display="flex"
                                                        flexDirection="column"
                                                        flexGrow={1}
                                                        width={0}
                                                        height={1}
                                                    >
                                                        <Typography noWrap variant="body1" sx={{ fontWeight: 600 }}>
                                                            {post.isAlert ? (
                                                                <Box component="span" color="red">
                                                                    !{" "}
                                                                </Box>
                                                            ) : null}
                                                            {post.taskDescription}
                                                        </Typography>
                                                        <Typography
                                                            sx={{
                                                                display: "-webkit-box",
                                                                overflow: "hidden",
                                                                WebkitLineClamp: "2",
                                                                WebkitBoxOrient: "vertical",
                                                                flex: "1 1 100%",
                                                                height: 0,
                                                            }}
                                                        >
                                                            <FormattedText str={post.text} />
                                                        </Typography>
                                                    </Box>
                                                </Tooltip>
                                            </Box>
                                        </ListItemButton>
                                    );
                                }}
                            </FixedSizeVirualizedList>
                        )}
                    </AutoSizer>
                </Box>
            )}
        </>
    );
}
