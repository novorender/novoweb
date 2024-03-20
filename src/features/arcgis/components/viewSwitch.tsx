import { Tab, Tabs } from "@mui/material";
import { useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";

import { useAppSelector } from "app";
import { AsyncStatus } from "types/misc";

import { selectArcgisFeatureServers, selectArcgisSelectedFeature } from "../arcgisSlice";

export function ViewSwitch() {
    const history = useHistory();
    const location = useLocation();
    const haveFeatureServers = useAppSelector((state) => {
        const featureServers = selectArcgisFeatureServers(state);
        return featureServers.status === AsyncStatus.Success && featureServers.data.length > 0;
    });

    // Open feature info tab when selecting an object
    // Open layers when unselecting
    const selectedFeature = useAppSelector(selectArcgisSelectedFeature);
    useEffect(() => {
        if (selectedFeature && history.location.pathname === "/") {
            history.push("/featureInfo");
        } else if (!selectedFeature && history.location.pathname === "/featureInfo") {
            history.push("/");
        }
    }, [history, selectedFeature]);

    if (!haveFeatureServers || !["/", "/featureInfo"].includes(location.pathname)) {
        return null;
    }

    return (
        <Tabs value={location.pathname} onChange={(_, path) => history.push(path)} variant="fullWidth">
            <Tab value="/" label="Layers" />
            <Tab value="/featureInfo" label="Feature info" />
        </Tabs>
    );
}
