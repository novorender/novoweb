import { Fragment, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";
import { Box, Button, FormControlLabel, ListItemButton, Typography, useTheme } from "@mui/material";
import { FilterAlt } from "@mui/icons-material";

import { Tooltip, ImgTooltip, Divider, IosSwitch, LinearProgress, FixedSizeVirualizedList } from "components";
import { useAppDispatch, useAppSelector } from "app/store";

import { baseUrl, useFeedWebRawQuery } from "../api";
import {
    ditioActions,
    initialFilters,
    selectFeedScrollOffset,
    selectFilters,
    selectDitioProject,
    selectShowDitioMarkers,
} from "../slice";

export function Feed() {
    const theme = useTheme();

    const dispatch = useAppDispatch();
    const showMarkers = useAppSelector(selectShowDitioMarkers);
    const feedScrollOffset = useAppSelector(selectFeedScrollOffset);
    const filters = useAppSelector(selectFilters);

    const projId = useAppSelector(selectDitioProject)?.id ?? "";
    const { data: feed, isLoading } = useFeedWebRawQuery({ projId, filters }, { skip: !projId });

    const scrollPos = useRef(feedScrollOffset);

    const toggleShowMarkers = () => dispatch(ditioActions.toggleShowMarkers());

    useEffect(() => {
        return () => {
            dispatch(ditioActions.setFeedScrollOffset(scrollPos.current));
        };
    }, [dispatch]);

    const filtersEnabled = Object.keys(filters).some((_key) => {
        const key = _key as any as keyof typeof filters;
        return filters[key] !== initialFilters[key];
    });

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <>
                    <Box px={1}>
                        <Divider />
                    </Box>
                    <Box display="flex">
                        <Button component={Link} to={`/filters`} color="grey">
                            <FilterAlt sx={{ mr: 1 }} />
                            Filters
                        </Button>
                        <FormControlLabel
                            sx={{ ml: 4 }}
                            control={
                                <IosSwitch
                                    size="medium"
                                    color="primary"
                                    checked={showMarkers}
                                    onChange={toggleShowMarkers}
                                />
                            }
                            label={
                                <Box fontSize={14} sx={{ userSelect: "none" }}>
                                    Show 2D markers
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
                <Typography>Unable to load feed.</Typography>
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
                                                component={Link}
                                                to={`/post/${post.id}`}
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
                                                            {newLineToHtmlBr(post.text)}
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
                                                            {newLineToHtmlBr(post.text)}
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

export function newLineToHtmlBr(str: string): JSX.Element[] {
    return str
        .replace(/^[\\n]+/, "")
        .split("\n")
        .flatMap((text, idx, arr) =>
            arr.length === 1 && !text ? [] : [<Fragment key={idx}>{text}</Fragment>, <br key={idx + "linebreak"} />]
        );
}
