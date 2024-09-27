import { Box } from "@mui/material";
import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { useCallback, useEffect, useState } from "react";
import { Route, Switch, useParams, useRouteMatch } from "react-router-dom";

import { useLazyGetGroupIdsQuery } from "apis/dataV2/dataV2Api";
import { LinearProgress } from "components";
import { objectGroupsActions, useDispatchObjectGroups, useObjectGroups } from "contexts/objectGroups";
import { useToggle } from "hooks/useToggle";
import { AsyncState, AsyncStatus } from "types/misc";

import { CreateJsonGroup } from "./createJsonGroup";
import { Details } from "./details";
import { Search } from "./search";

export function Crupdate({ sceneId }: { sceneId: string }) {
    const match = useRouteMatch();
    const id = useParams<{ id?: string }>().id;
    const objectGroups = useObjectGroups();
    const dispatchObjectGroups = useDispatchObjectGroups();
    const groupToEdit = id ? objectGroups.find((group) => group.id === id) : undefined;
    const [savedInputs, setSavedInputs] = useState<SearchPattern[]>(
        groupToEdit?.search ?? [{ property: "", value: "", exact: true }]
    );
    const [includeDescendants, toggleIncludeDescendants] = useToggle(groupToEdit?.includeDescendants ?? true);
    const [getGroupIds] = useLazyGetGroupIdsQuery();

    const [ids, setIds] = useState((): AsyncState<ObjectId[]> => {
        if (groupToEdit && !groupToEdit.ids) {
            return { status: AsyncStatus.Initial };
        }

        return { status: AsyncStatus.Success, data: groupToEdit?.ids ? Array.from(groupToEdit.ids) : [] };
    });

    const setIdsData = useCallback((arg: ObjectId[] | ((_ids: ObjectId[]) => ObjectId[])) => {
        if (Array.isArray(arg)) {
            setIds({ status: AsyncStatus.Success, data: arg });
        } else {
            setIds((state) => ({
                status: AsyncStatus.Success,
                data: arg(state.status === AsyncStatus.Success ? state.data : []),
            }));
        }
    }, []);

    useEffect(() => {
        loadGroupIds();

        async function loadGroupIds() {
            if (ids.status !== AsyncStatus.Initial || !groupToEdit) {
                return;
            }

            setIds({ status: AsyncStatus.Loading });

            try {
                const _ids = await getGroupIds({ projectId: sceneId, groupId: groupToEdit.id }).unwrap();

                dispatchObjectGroups(objectGroupsActions.update(groupToEdit.id, { ids: new Set(_ids) }));
                setIds({ status: AsyncStatus.Success, data: _ids });
            } catch (e) {
                console.warn(e);
                setIds({ status: AsyncStatus.Error, msg: "Failed to load group data." });
            }
        }
    }, [groupToEdit, ids, sceneId, dispatchObjectGroups, getGroupIds]);

    switch (ids.status) {
        case AsyncStatus.Initial:
        case AsyncStatus.Loading:
            return (
                <Box position="relative">
                    <LinearProgress />
                </Box>
            );
        case AsyncStatus.Error:
            return <Box p={1}>{ids.msg}</Box>;
        case AsyncStatus.Success:
            return (
                <Switch>
                    <Route path={match.path} exact>
                        <Search
                            savedInputs={savedInputs}
                            setSavedInputs={setSavedInputs}
                            ids={ids.data}
                            setIds={setIdsData}
                            toggleIncludeDescendants={toggleIncludeDescendants}
                        />
                    </Route>
                    <Route path={match.path + "/json"} exact>
                        <CreateJsonGroup
                            savedInputs={savedInputs}
                            setSavedInputs={setSavedInputs}
                            ids={ids.data}
                            setIds={setIdsData}
                            includeDescendants={includeDescendants}
                            toggleIncludeDescendants={toggleIncludeDescendants}
                        />
                    </Route>
                    <Route path={match.path + "/step2"}>
                        <Details
                            savedInputs={savedInputs}
                            groupToEdit={groupToEdit}
                            ids={ids.data}
                            includeDescendants={includeDescendants}
                        />
                    </Route>
                </Switch>
            );
    }
}
