import { ArrowBack, LocationOnOutlined } from "@mui/icons-material";
import { Avatar, Box, Button, ImageList, ImageListItem, Typography, useTheme } from "@mui/material";
import { format, formatDistance } from "date-fns";
import { Fragment } from "react";
import { useHistory, useParams } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "app/store";
import { Divider, LinearProgress, ScrollBox, Tooltip } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { FormattedText } from "features/ditio/formattedText";
import { CameraType, renderActions } from "features/render";
import { latLon2Tm } from "features/render/utils";
import { selectTmZoneForCalc } from "slices/explorerSlice";

import { baseUrl, useGetPostQuery } from "../../api";
import { ditioActions } from "../../slice";

export function Post() {
    const theme = useTheme();
    const postId = useParams<{ id: string }>().id;
    const history = useHistory();
    const {
        state: { view },
    } = useExplorerGlobals(true);

    const tmZone = useAppSelector(selectTmZoneForCalc);
    const dispatch = useAppDispatch();

    const { data: post, isFetching } = useGetPostQuery({ postId });

    const handleGoTo = () => {
        if (!post?.GeoCoordinate || !tmZone) {
            return;
        }

        const pos = latLon2Tm({
            coords: { latitude: post.GeoCoordinate.Latitude, longitude: post.GeoCoordinate.Longitude },
            tmZone,
        });
        dispatch(
            renderActions.setCamera({
                type: CameraType.Pinhole,
                goTo: {
                    position: [pos[0], pos[1], view.renderState.camera.position[2]],
                    rotation: view.renderState.camera.rotation,
                },
            })
        );
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader}>
                <Box px={1}>
                    <Divider />
                </Box>
                <Box display="flex">
                    <Button
                        onClick={() => {
                            history.push("/");
                            dispatch(ditioActions.setActivePost(""));
                        }}
                        color="grey"
                    >
                        <ArrowBack sx={{ mr: 1 }} />
                        Back
                    </Button>

                    {tmZone ? (
                        <Button disabled={!post?.GeoCoordinate} onClick={handleGoTo} color="grey">
                            <LocationOnOutlined sx={{ mr: 1 }} />
                            Go to
                        </Button>
                    ) : null}
                </Box>
            </Box>
            {isFetching ? (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            ) : !post ? (
                <Typography p={1}>Unable to load post.</Typography>
            ) : (
                <ScrollBox p={1} pb={3} position="relative">
                    <Box display="flex" alignItems="center" my={1}>
                        <Avatar sx={{ height: 48, width: 48, mr: 2 }} alt="" src={`${baseUrl}/${post.UserAvatarSrc}`} />
                        <Box>
                            <Typography fontWeight={600}>{post.UserName}</Typography>
                            <Tooltip
                                title={`Last modified: ${format(
                                    new Date(post.ModifiedDateTime ?? post.CreatedDateTime),
                                    "dd.MM.yyyy - HH:mm"
                                )}`}
                            >
                                <Typography color="text.secondary">
                                    {formatDistance(
                                        new Date(post.ModifiedDateTime ?? post.CreatedDateTime),
                                        new Date(),
                                        {
                                            addSuffix: true,
                                        }
                                    )}
                                </Typography>
                            </Tooltip>
                        </Box>
                    </Box>
                    <Divider />
                    <Typography variant="h6" my={1} fontWeight={600}>
                        {post.TaskDescription}
                    </Typography>
                    <Typography sx={{ mb: 2 }}>
                        <FormattedText str={post.Text ?? ""} />
                    </Typography>
                    {post.Images.length ? (
                        <ImageList cols={2} rowHeight={164} variant={"quilted"}>
                            {[...post.Images].reverse().map((image) => (
                                <ImageListItem
                                    sx={{ cursor: "pointer", bgcolor: "transparent", padding: 0, border: 0 }}
                                    component={"button"}
                                    onClick={() => dispatch(ditioActions.setActiveImg(`${baseUrl}/${image.UrlLg}`))}
                                    key={image.FileReferenceId}
                                    cols={1}
                                    onMouseEnter={() => {
                                        dispatch(
                                            ditioActions.setHoveredEntity({ kind: "image", id: image.FileReferenceId })
                                        );
                                    }}
                                    onMouseLeave={() => {
                                        dispatch(ditioActions.setHoveredEntity(undefined));
                                    }}
                                >
                                    <img src={`${baseUrl}/${image.UrlSm}`} alt={image.Name} loading="lazy" />
                                </ImageListItem>
                            ))}
                        </ImageList>
                    ) : null}
                    <Divider />
                    {post.Comments.length ? (
                        <Box bgcolor={theme.palette.grey[200]} mt={1} mx={-1} px={1} py={2}>
                            {post.Comments.map((comment, idx, arr) => {
                                const isLast = idx + 1 === arr.length;
                                return (
                                    <Fragment key={comment.Id}>
                                        <Box display="flex" mb={isLast ? 0 : 1}>
                                            <Avatar
                                                sx={{ height: 24, width: 24, mr: 1 }}
                                                alt=""
                                                src={`${baseUrl}/${comment.AvatarSrcSm}`}
                                            />
                                            <Box>
                                                <Box display="flex" alignItems="center">
                                                    <Typography fontWeight={600} fontSize={14}>
                                                        {comment.UserName}
                                                    </Typography>
                                                    <Tooltip
                                                        title={`Last modified: ${format(
                                                            new Date(
                                                                comment.ModifiedDateTime ?? comment.CreatedDateTime
                                                            ),
                                                            "dd.MM.yyyy - HH:mm"
                                                        )}`}
                                                    >
                                                        <Typography sx={{ ml: 1 }} color="text.secondary" fontSize={12}>
                                                            {formatDistance(
                                                                new Date(
                                                                    comment.ModifiedDateTime ?? comment.CreatedDateTime
                                                                ),
                                                                new Date(),
                                                                {
                                                                    addSuffix: true,
                                                                }
                                                            )}
                                                        </Typography>
                                                    </Tooltip>
                                                </Box>
                                                <Typography fontSize={14}>{comment.Text}</Typography>
                                            </Box>
                                        </Box>
                                        {!isLast ? <Divider sx={{ my: 1 }} /> : null}
                                    </Fragment>
                                );
                            })}
                        </Box>
                    ) : null}
                </ScrollBox>
            )}
        </>
    );
}
