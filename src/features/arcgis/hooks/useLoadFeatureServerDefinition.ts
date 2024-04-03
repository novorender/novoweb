import { request } from "@esri/arcgis-rest-request";
import { useEffect } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { useAbortController } from "hooks/useAbortController";
import { AsyncState, AsyncStatus } from "types/misc";

import { arcgisActions, selectArcgisFeatureServers } from "../arcgisSlice";
import { FeatureServerDefinition } from "../arcgisTypes";

export function useLoadFeatureServerDefinition() {
    const featureServers = useAppSelector(selectArcgisFeatureServers);
    const dispatch = useAppDispatch();

    const [abortController] = useAbortController();

    useEffect(() => {
        fetchMeta();

        async function fetchMeta() {
            if (featureServers.status !== AsyncStatus.Success) {
                return;
            }

            await Promise.all(
                featureServers.data
                    .filter((fs) => fs.definition.status === AsyncStatus.Initial)
                    .map(async (fs) => {
                        dispatch(
                            arcgisActions.setFeatureServerDefinition({
                                id: fs.id,
                                definition: { status: AsyncStatus.Loading },
                            })
                        );

                        let meta: AsyncState<FeatureServerDefinition>;
                        try {
                            const data = (await request(fs.url, {
                                signal: abortController.current.signal,
                            })) as FeatureServerDefinition;

                            // We only handle feature layers at the moment
                            data.layers = data.layers.filter((l) => l.type === "Feature Layer");

                            meta = { status: AsyncStatus.Success, data };
                        } catch (ex) {
                            console.warn(ex);
                            meta = { status: AsyncStatus.Error, msg: "Error loading feature server metadata" };
                        }

                        dispatch(arcgisActions.setFeatureServerDefinition({ id: fs.id, definition: meta }));
                    })
            );
        }
    }, [featureServers, abortController, dispatch]);
}
