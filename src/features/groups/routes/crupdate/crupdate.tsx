import { ObjectId, SearchPattern } from "@novorender/webgl-api";
import { Route, Switch, useParams, useRouteMatch } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { Box } from "@mui/material";

import { LinearProgress } from "components";
import { customGroupsActions, useCustomGroups } from "contexts/customGroups";
import { dataApi } from "app";
import { AsyncState, AsyncStatus } from "types/misc";

import { CreateJsonGroup } from "./createJsonGroup";
import { Details } from "./details";
import { Search } from "./search";

export function Crupdate({ sceneId }: { sceneId: string }) {
    const match = useRouteMatch();
    const id = useParams<{ id?: string }>().id;
    const { state: customGroups, dispatch: dispatchCustomGroups } = useCustomGroups();
    const groupToEdit = id ? customGroups.find((group) => group.id === id) : undefined;
    const [savedInputs, setSavedInputs] = useState<SearchPattern[]>(
        groupToEdit?.search ?? [{ property: "", value: "", exact: true }]
    );

    const [ids, setIds] = useState((): AsyncState<ObjectId[]> => {
        if (groupToEdit && !groupToEdit.ids) {
            return { status: AsyncStatus.Initial };
        }

        return { status: AsyncStatus.Success, data: groupToEdit?.ids ?? [] };
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
                const _ids = await dataApi.getGroupIds(sceneId, groupToEdit.id);

                dispatchCustomGroups(customGroupsActions.update(groupToEdit.id, { ids: _ids }));
                setIds({ status: AsyncStatus.Success, data: _ids });
            } catch (e) {
                console.warn(e);
                setIds({ status: AsyncStatus.Error, msg: "Failed to load group data." });
            }
        }
    }, [groupToEdit, ids, sceneId, dispatchCustomGroups]);

    switch (ids.status) {
        case AsyncStatus.Initial:
        case AsyncStatus.Loading:
            return <LinearProgress />;
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
                        />
                    </Route>
                    <Route path={match.path + "/json"} exact>
                        <CreateJsonGroup
                            savedInputs={savedInputs}
                            setSavedInputs={setSavedInputs}
                            ids={ids.data}
                            setIds={setIdsData}
                        />
                    </Route>
                    <Route path={match.path + "/step2"}>
                        <Details savedInputs={savedInputs} groupToEdit={groupToEdit} ids={ids.data} />
                    </Route>
                </Switch>
            );
    }
}