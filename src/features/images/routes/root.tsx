import { CancelPresentation, FilterAlt } from "@mui/icons-material";
import { Box, Button, FormControlLabel, Typography, useTheme } from "@mui/material";
import { ObjectDB } from "@novorender/data-js-api";
import { SearchPattern } from "@novorender/webgl-api";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { store } from "app/store";
import { IosSwitch, LinearProgress, withCustomScrollbar } from "components";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { flip, flipGLtoCadQuat, isGlSpace, latLon2Tm } from "features/render/utils";
import { selectTmZoneForCalc } from "slices/explorer";
import { AsyncStatus, hasFinished } from "types/misc";

import { ImageListItem } from "../imageListItem";
import {
    ImageFilter,
    imagesActions,
    selectActiveImage,
    selectImageFilter,
    selectImages,
    selectShowImageMarkers,
} from "../imagesSlice";
import { Image, ImageType } from "../types";

const StyledFixedSizeList = withCustomScrollbar(FixedSizeList) as typeof FixedSizeList;

export function Root() {
    const theme = useTheme();
    const {
        state: { db, scene },
    } = useExplorerGlobals(true);
    const { t } = useTranslation();

    const images = useAppSelector(selectImages);
    const filter = useAppSelector(selectImageFilter);
    const tmZone = useAppSelector(selectTmZoneForCalc);
    const dispatch = useAppDispatch();

    useEffect(() => {
        if (images.status === AsyncStatus.Initial) {
            loadImages({ db, tmZone, filter, flip: isGlSpace(scene.up) });
        }
    }, [images, db, tmZone, filter, scene]);

    return (
        <>
            <Header />
            <Progress />

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
                                    itemCount={images.data.length}
                                >
                                    {({ index, style }) => <ImageListItem image={images.data[index]} style={style} />}
                                </StyledFixedSizeList>
                            )}
                        </AutoSizer>
                    </Box>
                ) : (
                    <Box p={1}>
                        <Typography textAlign={"center"} mt={1}>
                            {t("noImagesFound.")}
                        </Typography>
                        {!tmZone && (
                            <Typography mt={2}>
                                {t("tM-ZoneIsNotSet.AdminsCanSetThisUnderAdvancedSettings")} {"->"} {t("project.")}
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
                                    {t("clearFilter")}
                                </Button>
                            </Box>
                        )}
                    </Box>
                )
            ) : null}
        </>
    );
}

// NOTE(OLA): Moved <Cancel /> and <Progress /> out of main component as activeImage changes caused images in list to reload.
function Cancel() {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const activeImage = useAppSelector(selectActiveImage);

    return (
        <Button color="grey" onClick={() => dispatch(imagesActions.setActiveImage(undefined))} disabled={!activeImage}>
            <CancelPresentation sx={{ mr: 1 }} />
            {t("cancel")}
        </Button>
    );
}

function Progress() {
    const images = useAppSelector(selectImages);
    const activeImage = useAppSelector(selectActiveImage);

    if (hasFinished(images) && activeImage?.status !== AsyncStatus.Loading) {
        return null;
    }

    return (
        <Box>
            <LinearProgress />
        </Box>
    );
}

function Header() {
    const { t } = useTranslation();
    const history = useHistory();
    const showMarkers = useAppSelector(selectShowImageMarkers);
    const dispatch = useAppDispatch();

    const toggleShowMarkers = () => {
        dispatch(imagesActions.setShowMarkers(!showMarkers));
    };

    return (
        <Box boxShadow={(theme) => theme.customShadows.widgetHeader} display="flex" justifyContent={"space-between"}>
            <Button onClick={() => history.push("/filter")} color="grey">
                <FilterAlt sx={{ mr: 1 }} />
                {t("filter")}
            </Button>
            <FormControlLabel
                control={<IosSwitch size="medium" color="primary" checked={showMarkers} onChange={toggleShowMarkers} />}
                label={<Box fontSize={14}>{t("showMarkers")}</Box>}
            />
            <Cancel />
        </Box>
    );
}

async function loadImages({
    db,
    tmZone,
    filter,
    ...options
}: {
    db: ObjectDB;
    tmZone: string | undefined;
    filter: ImageFilter;
    flip: boolean;
}) {
    try {
        const images: Image[] = [];
        const searchPattern: SearchPattern[] = [{ property: "Image/Preview", value: "", exact: true }];

        if (filter.type === ImageType.Flat) {
            searchPattern.push({ property: "Image/Gltf", value: "", exact: true, exclude: true });
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
            undefined,
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
                    position: options.flip ? flip(JSON.parse(pos[1])) : JSON.parse(pos[1]),
                };

                if (gltf) {
                    images.push({
                        ...base,
                        gltf: gltf[1],
                        src: src ? src[1] : "",
                        rotation: options.flip ? flipGLtoCadQuat(JSON.parse(rot[1])) : JSON.parse(rot[1]),
                    });
                } else if (src) {
                    images.push({
                        ...base,
                        src: src[1],
                    });
                }
            } else if (lat && lon && tmZone) {
                const elevation = image.properties.find((prop) => prop[0] === "Image/Elevation");
                const position = latLon2Tm({ tmZone, coords: { latitude: Number(lat[1]), longitude: Number(lon[1]) } });
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
                        src: src ? src[1] : "",
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
            imagesActions.setImages({ status: AsyncStatus.Error, msg: "An error occurred while loading images." }),
        );
    }
}
