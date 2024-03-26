import { vec3 } from "gl-matrix";
import { useEffect, useState } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { isRealVec } from "utils/misc";

import { useGetIssuesQuery } from "./jiraApi";
import {
    selectJiraAccessTokenData,
    selectJiraComponent,
    selectJiraFilters,
    selectJiraHoveredEntity,
    selectJiraMarkersConfig,
    selectJiraProject,
    selectJiraUser,
    selectMetaCustomfieldKey,
} from "./jiraSlice";

type JiraMarkerData = {
    position: vec3;
    key: string;
    icon: string;
};

const empty = [] as JiraMarkerData[];

export function useJiraMarkers() {
    const [markers, setMarkers] = useState(empty);
    const project = useAppSelector(selectJiraProject);
    const component = useAppSelector(selectJiraComponent);
    const accessToken = useAppSelector(selectJiraAccessTokenData);
    const currentUser = useAppSelector(selectJiraUser);
    const metaCustomfieldKey = useAppSelector(selectMetaCustomfieldKey);
    const filters = useAppSelector(selectJiraFilters);
    const hoveredEntity = useAppSelector(selectJiraHoveredEntity);
    const config = useAppSelector(selectJiraMarkersConfig);
    const showMarkers = config.show;

    const { data: issues } = useGetIssuesQuery(
        {
            project: project?.key ?? "",
            component: component?.id ?? "",
            userId: currentUser?.accountId ?? "",
            filters,
        },
        { skip: !project || !component || !accessToken, refetchOnMountOrArgChange: true }
    );

    useEffect(() => {
        if (!metaCustomfieldKey || !issues || !showMarkers) {
            setMarkers(empty);
            return;
        }

        setMarkers(
            issues
                .filter((issue) => issue.fields[metaCustomfieldKey])
                .map((issue): JiraMarkerData | undefined => {
                    const field = issue.fields[metaCustomfieldKey];

                    if (!field || typeof field !== "string") {
                        return;
                    }

                    try {
                        return {
                            key: issue.key,
                            ...JSON.parse(field),
                            icon: config.issueTypes[issue.fields.issuetype.id]?.icon ?? "default",
                        };
                    } catch (e) {
                        console.warn("error parsing NOVORENDER_META of issue", issue.key);
                    }

                    return undefined;
                })
                .filter((marker) => marker !== undefined && isRealVec(marker.position))
                .slice(0, 100) as JiraMarkerData[]
        );
    }, [issues, metaCustomfieldKey, showMarkers, config.issueTypes]);

    useEffect(() => {
        setMarkers((state) => {
            const hoveredMarker = state.find((marker) => marker.key === hoveredEntity);

            if (hoveredMarker) {
                const res = state.filter((marker) => marker !== hoveredMarker);
                res.push(hoveredMarker);
                return res;
            }

            return state;
        });
    }, [hoveredEntity]);

    return markers;
}
