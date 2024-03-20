import { connect, MqttClient } from "precompiled-mqtt";
import { useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "app/redux-store-interactions";
import { selectProjectSettings } from "features/render";
import { latLon2Tm } from "features/render/utils";

import { selectXsiteManageAccessToken, selectXsiteManageSite, xsiteManageActions } from "../slice";
import { MachineLocation } from "../types";

export function useHandleXsiteManageMachineLocations() {
    const dispatch = useAppDispatch();
    const accessToken = useAppSelector(selectXsiteManageAccessToken);
    const site = useAppSelector(selectXsiteManageSite);
    const { tmZone } = useAppSelector(selectProjectSettings);
    const currentClient = useRef<MqttClient>();

    useEffect(() => {
        if (!site || !tmZone || !("data" in accessToken) || !accessToken.data) {
            return;
        }

        const disconnect = () => {
            if (currentClient.current) {
                currentClient.current.end();
                currentClient.current = undefined;
            }
        };

        disconnect();

        try {
            const email = JSON.parse(atob(accessToken.data?.split(".")[1])).email;
            const client = connect(
                `wss://iot.prod.xsitemanage.com/mqtt?token=${accessToken.data}&contextType=ext-site&contextId=${site.siteId}`,
                { clientId: `prod-user-${email}-${window.crypto.randomUUID()}`, protocol: "wss" }
            );

            currentClient.current = client;

            client.subscribe(`prod-ext/site:${site.siteId}/+/status`);
            client.on("message", (_topic, msgBuffer) => {
                try {
                    const message = JSON.parse(msgBuffer.toString()) as Omit<MachineLocation, "position">;
                    const position = latLon2Tm({ coords: message, tmZone });
                    dispatch(xsiteManageActions.registerMachineLocation({ ...message, position }));
                } catch (e) {
                    console.warn(e);
                }
            });
        } catch (e) {
            console.warn(e);
        }

        return disconnect;
    }, [site, accessToken, tmZone, dispatch]);
}
