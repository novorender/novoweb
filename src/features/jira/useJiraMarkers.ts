import { vec3 } from "gl-matrix";
import { useEffect, useState } from "react";

import { useAppSelector } from "app/store";

import { useGetIssuesQuery } from "./jiraApi";
import {
    selectJiraAccessTokenData,
    selectJiraComponent,
    selectJiraFilters,
    selectJiraProject,
    selectJiraShowMarkers,
    selectJiraUser,
    selectMetaCustomfieldKey,
} from "./jiraSlice";

type JiraMarkerData = {
    position: vec3;
    key: string;
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
    const showMarkers = useAppSelector(selectJiraShowMarkers);

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
                    try {
                        return { key: issue.key, ...JSON.parse(issue.fields[metaCustomfieldKey]) };
                    } catch (e) {
                        console.warn("error parsing NOVORENDER_META of issue", issue.key);
                    }

                    return undefined;
                })
                .filter((marker) => marker !== undefined)
                .slice(0, 100) as JiraMarkerData[]
        );
    }, [issues, metaCustomfieldKey, showMarkers]);

    return markers;
}
