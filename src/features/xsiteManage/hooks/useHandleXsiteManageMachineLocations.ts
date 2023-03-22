import { connect, MqttClient } from "precompiled-mqtt";
import { useEffect, useRef } from "react";

import { dataApi } from "app";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectProjectSettings } from "features/render/renderSlice";

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

            client.on("connect", () => console.log(`Connected ${email} to ${site.siteId}`));
            client.on("disconnect", () => console.log(`Disconnected ${email} from ${site.siteId}`));
            client.on("reconnect", () => console.log(`Reconnected ${email} to ${site.siteId}`));
            client.on("end", () => console.log(`Ended ${email} at ${site.siteId}`));
            client.subscribe(`prod-ext/site:${site.siteId}/+/status`, () =>
                console.log(`Subscribed to all machines at ${site.siteId}`)
            );
            client.on("message", (_topic, msgBuffer) => {
                try {
                    const message = JSON.parse(msgBuffer.toString()) as Omit<MachineLocation, "position">;
                    const position = dataApi.latLon2tm(message, tmZone);
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
