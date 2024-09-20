import Intercom, { shutdown } from "@intercom/messenger-js-sdk";
import { useMediaQuery, useTheme } from "@mui/material";
import { useEffect, useRef } from "react";

import { useAppSelector } from "app/redux-store-interactions";
import { selectUser } from "slices/authSlice";
import { selectConfig, selectNewDesign } from "slices/explorer";

export function useIntercom() {
    const config = useAppSelector(selectConfig);
    const user = useAppSelector(selectUser);
    const newDesign = useAppSelector(selectNewDesign);
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("md"));
    const hidden = window.innerWidth < 1024;
    const mounted = useRef(false);

    useEffect(() => {
        if (config.intercomAppId && user && !hidden) {
            Intercom({
                app_id: config.intercomAppId,
                region: "eu",
                user_id: user.user,
                name: user.name,
                company: user.organization,
                alignment: "left",
                horizontal_padding: isSmall ? 70 : newDesign ? 20 : 80,
                vertical_padding: isSmall ? 12 : 20,
            });
            mounted.current = true;
        }

        if (mounted.current && hidden) {
            shutdown();
        }
    }, [config.intercomAppId, user, newDesign, hidden, isSmall]);
}
