import { CancelPresentation, FilterAlt } from "@mui/icons-material";
import { Box, Button, FormControlLabel, Typography, useTheme } from "@mui/material";
import { ObjectDB, SearchPattern } from "@novorender/webgl-api";
import { useEffect } from "react";
import { useHistory } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";

import { dataApi } from "app";
import { store, useAppDispatch, useAppSelector } from "app/store";
import { IosSwitch, LinearProgress, withCustomScrollbar } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { selectProjectSettings } from "features/render/renderSlice";
import { AsyncStatus, hasFinished } from "types/misc";

import { ImageListItem } from "../imageListItem";
import {
    Image,
    ImageFilter,
    ImageType,
    imagesActions,
    selectActiveImage,
    selectImageFilter,
    selectImages,
    selectShowImageMarkers,
} from "../imagesSlice";
import { flip, flipGLtoCadQuat } from "features/render/utils";

const StyledFixedSizeList = withCustomScrollbar(FixedSizeList) as typeof FixedSizeList;

export function Root() {
    const theme = useTheme();
    const history = useHistory();
    const {
        state: { db },
    } = useExplorerGlobals(true);

    const images = useAppSelector(selectImages);
    const filter = useAppSelector(selectImageFilter);
    const activeImage = useAppSelector(selectActiveImage);
    const showMarkers = useAppSelector(selectShowImageMarkers);
    const { tmZone } = useAppSelector(selectProjectSettings);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (images.status === AsyncStatus.Initial) {
            loadImages(db, tmZone, filter);
        }
    }, [images, db, tmZone, filter]);

    const toggleShowMarkers = () => {
        dispatch(imagesActions.setShowMarkers(!showMarkers));
    };

    return (
        <>
            <Box boxShadow={theme.customShadows.widgetHeader} display="flex" justifyContent={"space-between"}>
                <Button onClick={() => history.push("/filter")} color="grey">
                    <FilterAlt sx={{ mr: 1 }} />
                    Filter
                </Button>
                <FormControlLabel
                    control={
                        <IosSwitch size="medium" color="primary" checked={showMarkers} onChange={toggleShowMarkers} />
                    }
                    label={<Box fontSize={14}>Show markers</Box>}
                />
                <Button
                    color="grey"
                    onClick={() => dispatch(imagesActions.setActiveImage(undefined))}
                    disabled={!activeImage}
                >
                    <CancelPresentation sx={{ mr: 1 }} />
                    Cancel
                </Button>
            </Box>

            {(!hasFinished(images) || activeImage?.status === AsyncStatus.Loading) && (
                <Box>
                    <LinearProgress />
                </Box>
            )}

            {hasFinished(images) ? (
                images.status === AsyncStatus.Error ? (
                    <Box p={1}>
                        <Typography>{images.msg}</Typography>
                    </Box>
                ) : images.data.length ? (
                    <Box flex={"1 1 100%"}>
                        <AutoSizer>
                            {({ height, width }) => (
                                <StyledFixedSizeList
                                    style={{ paddingLeft: theme.spacing(1), paddingRight: theme.spacing(1) }}
                                    height={height}
                                    width={width}
                                    itemSize={80}
                                    overscanCount={3}
                                    itemCount={images.data.length ?? 0}
                                >
                                    {({ index, style }) => <ImageListItem image={images.data[index]} style={style} />}
                                </StyledFixedSizeList>
                            )}
                        </AutoSizer>
                    </Box>
                ) : (
                    <Box p={1}>
                        <Typography textAlign={"center"} mt={1}>
                            No images found.
                        </Typography>
                        {!tmZone && (
                            <Typography mt={2}>
                                TM-Zone is not set. Admins can set this under Advanced settings {"->"} Project.
                            </Typography>
                        )}
                        {Object.values(filter).some((val) => val !== "" && val !== "all") && (
                            <Box width={1} mt={3} display="flex" justifyContent="center">
                                <Button
                                    variant="contained"
                                    onClick={() => {
                                        dispatch(imagesActions.clearFilter());
                                        dispatch(imagesActions.setImages({ status: AsyncStatus.Initial }));
                                    }}
                                >
                                    Clear filter
                                </Button>
                            </Box>
                        )}
                    </Box>
                )
            ) : null}
        </>
    );
}

async function loadImages(db: ObjectDB, tmZone: string, filter: ImageFilter) {
    try {
        const images: Image[] = [];
        const searchPattern: SearchPattern[] = [{ property: "Image/Preview", value: "", exact: true }];

        if (filter.type === ImageType.Flat) {
            searchPattern.push({ property: "Image/Image", value: "", exact: true });
        } else if (filter.type === ImageType.Panorama) {
            searchPattern.push({ property: "Image/Gltf", value: "", exact: true });
        }

        if (filter.dateFrom || filter.dateTo) {
            searchPattern.push({
                property: "Date-Time",
                // NOTE(OLA): Remove fallbacks when API is fixed
                range: { min: filter.dateFrom || "20000000z", max: filter.dateTo || "21000000z" },
                exact: true,
            });
        }

        for await (const img of db.search(
            {
                searchPattern,
                full: true,
            },
            undefined
        )) {
            const image = await img.loadMetaData();
            const name = image.name;
            // NOTE(OLA): GUID property was not always uppercase
            const guid = image.properties.find((prop) => prop[0].toUpperCase() === "GUID")![1];
            const gltf = image.properties.find((prop) => prop[0] === "Image/Gltf");
            const src = image.properties.find((prop) => prop[0] === "Image/Image");
            const preview = image.properties.find((prop) => prop[0] === "Image/Preview")![1];
            const pos = image.properties.find((prop) => prop[0] === "Image/Position");
            const rot = image.properties.find((prop) => prop[0] === "Image/Rotation");
            const lat = image.properties.find((prop) => prop[0] === "Image/Latitude");
            const lon = image.properties.find((prop) => prop[0] === "Image/Longitude");

            if (!gltf && !src) {
                continue;
            }

            if (pos && rot) {
                const base = {
                    name,
                    guid,
                    preview,
                    position: flip(JSON.parse(pos[1])),
                };

                if (gltf) {
                    images.push({
                        ...base,
                        gltf: gltf[1],
                        rotation: flipGLtoCadQuat(JSON.parse(rot[1])),
                    });
                } else if (src) {
                    images.push({
                        ...base,
                        src: src[1],
                    });
                }
            } else if (lat && lon && tmZone) {
                const elevation = image.properties.find((prop) => prop[0] === "Image/Elevation");
                const position = flip(
                    dataApi.latLon2tm({ latitude: Number(lat[1]), longitude: Number(lon[1]) }, tmZone)
                );

                if (elevation) {
                    position[2] = Number(elevation[1]);
                }

                const base = {
                    name,
                    guid,
                    preview,
                    position,
                };

                if (gltf) {
                    images.push({
                        ...base,
                        gltf: gltf[1],
                    });
                } else if (src) {
                    images.push({
                        ...base,
                        src: src[1],
                    });
                }
            }
        }
        store.dispatch(imagesActions.setImages({ status: AsyncStatus.Success, data: images }));
    } catch (e) {
        console.warn(e);
        store.dispatch(
            imagesActions.setImages({ status: AsyncStatus.Error, msg: "An error occurred while loading images." })
        );
    }
}
