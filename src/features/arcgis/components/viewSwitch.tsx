import { Tab, Tabs } from "@mui/material";
import { useHistory, useLocation } from "react-router-dom";

import { useAppSelector } from "app/store";

import { selectArcgisFeatureServers } from "../arcgisSlice";

export function ViewSwitch() {
    const history = useHistory();
    const location = useLocation();
    const noFeatureServers = useAppSelector((state) => selectArcgisFeatureServers(state).length === 0);

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
