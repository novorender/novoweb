import { dataApi } from "app";
import { vec3 } from "gl-matrix";
import { useEffect, useRef, useState } from "react";

import { useAppSelector } from "app/store";
import { CameraType, selectCameraType, selectProjectSettings } from "features/render";

import { baseUrl, useFeedWebRawQuery, useGetPostQuery } from "./api";
import {
    selectActivePost,
    selectDitioProject,
    selectFilters,
    selectHoveredEntity,
    selectShowDitioMarkers,
} from "./slice";

const emptyPosts = [] as {
    position: vec3;
    id: string;
}[];

const emptyImgs = [] as {
    position: vec3;
    id: string;
    src: string;
}[];

export function useDitioMarkers() {
    const filters = useAppSelector(selectFilters);
    const projId = useAppSelector(selectDitioProject)?.id ?? "";
    const { tmZone } = useAppSelector(selectProjectSettings);
    const showMarkers = useAppSelector(selectShowDitioMarkers);
    const cameraType = useAppSelector(selectCameraType);
    const { data: feed, isFetching: isFetchingPosts } = useFeedWebRawQuery({ projId, filters }, { skip: !projId });
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

        let markers = feed
            .filter((post) => post.geoLocation)
            .slice(0, 100)
            .map(({ id, geoLocation }) => ({
                id,
                position: dataApi.latLon2tm({ longitude: geoLocation!.lon, latitude: geoLocation!.lat }, tmZone),
            }));

        if (hoveredEntity?.kind === "post") {
            const hoveredMarker = markers.find((marker) => marker.id === hoveredEntity.id);

            if (hoveredMarker) {
                markers = markers.filter((marker) => marker.id !== hoveredMarker.id);
                markers.push(hoveredMarker);
            }
        }

        setPostMarkers(markers);
    }, [feed, disabled, tmZone, hoveredEntity, postMarkers.length, isFetchingPosts]);

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
            position: dataApi.latLon2tm({ longitude: img.Longitude, latitude: img.Latitude }, tmZone),
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
