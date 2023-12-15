import { vec3 } from "gl-matrix";
import { useEffect, useRef, useState } from "react";

import { dataApi } from "app";
import { useAppSelector } from "app/store";
import { useExplorerGlobals } from "contexts/explorerGlobals";
import { CameraType, selectCameraType, selectProjectSettings } from "features/render";
import { flip } from "features/render/utils";
import { AsyncStatus } from "types/misc";

import { baseUrl, useFeedWebRawQuery, useGetPostQuery } from "../api";
import {
    selectActivePost,
    selectDitioAccessToken,
    selectDitioFeedInitialized,
    selectDitioProjects,
    selectFilters,
    selectHoveredEntity,
    selectShowDitioFeedMarkers,
} from "../slice";

const emptyPosts = [] as {
    position: vec3;
    id: string;
}[];

const emptyImgs = [] as {
    position: vec3;
    id: string;
    src: string;
}[];

export function useDitioFeedMarkers() {
    const {
        state: { scene },
    } = useExplorerGlobals();
    const filters = useAppSelector(selectFilters);
    const projects = useAppSelector(selectDitioProjects);
    const { tmZone } = useAppSelector(selectProjectSettings);
    const showMarkers = useAppSelector(selectShowDitioFeedMarkers);
    const cameraType = useAppSelector(selectCameraType);
    const token = useAppSelector(selectDitioAccessToken);
    const isInitialized = useAppSelector(selectDitioFeedInitialized);
    const { data: feed, isFetching: isFetchingPosts } = useFeedWebRawQuery(
        { projects, filters },
        { skip: !projects.length || token.status !== AsyncStatus.Success || !isInitialized }
    );
    const activePost = useAppSelector(selectActivePost);
    const { data: post } = useGetPostQuery({ postId: activePost }, { skip: !activePost });
    const hoveredEntity = useAppSelector(selectHoveredEntity);

    const [postMarkers, setPostMarkers] = useState(emptyPosts);
    const [imgMarkers, setImgMarkers] = useState(emptyImgs);
    const currentPost = useRef("");

    const disabled = cameraType !== CameraType.Orthographic || !showMarkers || !tmZone;

    useEffect(() => {
        if (!feed) {
            return;
        }

        if (isFetchingPosts || disabled) {
            setPostMarkers(emptyPosts);
            setImgMarkers(emptyImgs);
            currentPost.current = "";
            return;
        }

        if (postMarkers.length && (!hoveredEntity || hoveredEntity.kind === "image")) {
            return;
        }

        const isGlSpace = !vec3.equals(scene?.up ?? [0, 1, 0], [0, 0, 1]);
        let markers = feed
            .filter((post) => post.geoLocation)
            .slice(0, 100)
            .map(({ id, geoLocation }) => ({
                id,
                position: isGlSpace
                    ? flip(dataApi.latLon2tm({ longitude: geoLocation!.lon, latitude: geoLocation!.lat }, tmZone))
                    : dataApi.latLon2tm({ longitude: geoLocation!.lon, latitude: geoLocation!.lat }, tmZone),
            }));

        if (hoveredEntity?.kind === "post") {
            const hoveredMarker = markers.find((marker) => marker.id === hoveredEntity.id);

            if (hoveredMarker) {
                markers = markers.filter((marker) => marker.id !== hoveredMarker.id);
                markers.push(hoveredMarker);
            }
        }

        setPostMarkers(markers);
    }, [feed, disabled, tmZone, hoveredEntity, postMarkers.length, isFetchingPosts, scene]);

    useEffect(() => {
        if (!post || post.Id !== activePost || disabled) {
            setImgMarkers(emptyImgs);
            currentPost.current = "";
            return;
        }

        if (currentPost.current === post.Id && imgMarkers.length && (!hoveredEntity || hoveredEntity.kind === "post")) {
            return;
        }

        let markers = post.Images.map((img) => ({
            id: img.FileReferenceId,
            position: flip(dataApi.latLon2tm({ longitude: img.Longitude, latitude: img.Latitude }, tmZone)),
            src: `${baseUrl}/${img.UrlLg}`,
        }));

        if (hoveredEntity?.kind === "image") {
            const hoveredMarker = markers.find((marker) => marker.id === hoveredEntity.id);

            if (hoveredMarker) {
                markers = markers.filter((marker) => marker.id !== hoveredMarker.id);
                markers.push(hoveredMarker);
            }
        }

        currentPost.current = activePost;
        setImgMarkers(markers);
    }, [post, disabled, tmZone, hoveredEntity, imgMarkers.length, activePost]);

    return [postMarkers, imgMarkers] as const;
}