import { FilterAlt } from "@mui/icons-material";
import { Box, Button, FormControlLabel, ListItemButton, Typography, useTheme } from "@mui/material";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link, Redirect, useHistory } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";

import { Permission } from "apis/dataV2/permissions";
import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { Divider, FixedSizeVirualizedList, ImgTooltip, IosSwitch, LinearProgress, Tooltip } from "components";
import { featuresConfig } from "config/features";
import { FormattedText } from "features/ditio/formattedText";
import { useCheckProjectPermission } from "hooks/useCheckProjectPermissions";
import { selectHasAdminCapabilities } from "slices/explorer";

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
    const { t } = useTranslation();
    const theme = useTheme();
    const history = useHistory();

    const dispatch = useAppDispatch();
    const showFeedMarkers = useAppSelector(selectShowDitioFeedMarkers);
    const showMachineMarkers = useAppSelector(selectShowDitioMachineMarkers);
    const feedScrollOffset = useAppSelector(selectFeedScrollOffset);
    const filters = useAppSelector(selectFilters);
    const isAdmin = useAppSelector(selectHasAdminCapabilities);
    const checkPermission = useCheckProjectPermission();
    const canManage = checkPermission(Permission.IntDitioManage) ?? isAdmin;

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
        if (canManage) {
            return <Redirect to="/settings" />;
        } else {
            return (
                <>
                    <Box
                        boxShadow={(theme) => theme.customShadows.widgetHeader}
                        sx={{ height: 5, width: 1, mt: "-5px" }}
                        position="absolute"
                    />
                    <Typography p={1}>{t("notSetUpForProject", { name: t(featuresConfig.ditio.nameKey) })}</Typography>
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
                            {t("filters")}
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
                                    {t("feed")}
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
                                    {t("machines")}
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
                <Typography p={1}>{t("unableToLoadFeed")}</Typography>
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
                        {t("foundNoPosts")}
                        {filtersEnabled ? (
                            <Button
                                sx={{ mt: 2 }}
                                variant="contained"
                                onClick={() => dispatch(ditioActions.resetFilters())}
                            >
                                {t("resetFilters")}
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
                                                        ditioActions.setHoveredEntity({ kind: "post", id: post.id }),
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
                                                                        {"! "}
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
                                                                    {"! "}
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
