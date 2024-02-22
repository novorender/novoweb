import { Tab, Tabs } from "@mui/material";
import { useEffect } from "react";
import { useHistory, useLocation } from "react-router-dom";

import { useAppSelector } from "app/store";

import { selectArcgisFeatureServers, selectArcgisSelectedFeature } from "../arcgisSlice";

export function ViewSwitch() {
    const history = useHistory();
    const location = useLocation();
    const noFeatureServers = useAppSelector((state) => selectArcgisFeatureServers(state).length === 0);

    // Open feature info tab when selecting an object
    const selectedFeature = useAppSelector(selectArcgisSelectedFeature);
    useEffect(() => {
        if (selectedFeature && history.location.pathname === "/") {
            history.push("/featureInfo");
        } else if (!selectedFeature && history.location.pathname === "/featureInfo") {
            history.push("/");
        }
    }, [history, selectedFeature]);

    if (noFeatureServers || !["/", "/featureInfo"].includes(location.pathname)) {
        return null;
    }

    return (
        <Tabs value={location.pathname} onChange={(_, path) => history.push(path)} variant="fullWidth">
            <Tab value="/" label="Layers" />
            <Tab value="/featureInfo" label="Feature info" />
        </Tabs>
    );
}
