import { Box, Button, Grid } from "@mui/material";

import { LogoSpeedDial, ScrollBox, WidgetContainer, WidgetHeader } from "components";
import { useToggle } from "hooks/useToggle";
import { featuresConfig } from "config/features";
import { WidgetList } from "features/widgetList";
import { useAppSelector } from "app/store";
import { selectMsalAccount, selectUser, User as UserType } from "slices/authSlice";
import { useSceneId } from "hooks/useSceneId";
import { deleteFromStorage } from "utils/storage";
import { StorageKey } from "config/storage";
import { msalInstance } from "app";
import { selectMaximized, selectMinimized, selectUserRole, UserRole } from "slices/explorerSlice";

export default function User() {
    const [menuOpen, toggleMenu] = useToggle();

    const minimized = useAppSelector(selectMinimized) === featuresConfig.user.key;
    const maximized = useAppSelector(selectMaximized) === featuresConfig.user.key;

    const user = useAppSelector(selectUser);

    return (
        <>
            <WidgetContainer minimized={minimized} maximized={maximized}>
                <WidgetHeader widget={featuresConfig.user} disableShadow={menuOpen} />
                <ScrollBox p={1} mt={2} display={!menuOpen && !minimized ? "flex" : "none"} flexDirection="column">
                    {user ? <LoggedIn user={user} /> : <LoggedOut />}
                </ScrollBox>
                {menuOpen && <WidgetList widgetKey={featuresConfig.user.key} onSelect={toggleMenu} />}
            </WidgetContainer>
            <LogoSpeedDial open={menuOpen} toggle={toggleMenu} testId={`${featuresConfig.user.key}-widget-menu-fab`} />
        </>
    );
}

function LoggedIn({ user }: { user: UserType }) {
    const msalAccount = useAppSelector(selectMsalAccount);
    const role = useAppSelector(selectUserRole);

    const logOut = () => {
        deleteFromStorage(StorageKey.NovoToken);
        deleteFromStorage(StorageKey.MsalActiveAccount);

        if (msalAccount) {
            msalInstance.logoutRedirect({
                account: msalAccount,
            });
        } else {
            window.location.reload();
        }
    };

    return (
        <>
            <Grid container>
                <Grid fontWeight={600} item xs={5}>
                    User:
                </Grid>
                <Grid item xs={7}>
                    {user.user}
                </Grid>

                <Grid fontWeight={600} item xs={5}>
                    Role:
                </Grid>
                <Grid item xs={7}>
                    {role === UserRole.Admin ? "Admin" : role === UserRole.Owner ? "Owner" : "Viewer"}
                </Grid>

                <Grid fontWeight={600} item xs={5}>
                    Organization:
                </Grid>
                <Grid item xs={7}>
                    {user.organization}
                </Grid>
            </Grid>
            <Button onClick={logOut} sx={{ mt: 2 }} variant="outlined">
                Log out
            </Button>
        </>
    );
}

function LoggedOut() {
    const sceneId = useSceneId();

    return (
        <Box width={1} display="flex" flexDirection="column" justifyContent="center" alignItems="center">
            <Button
                component="a"
                href={`${window.location.origin}/login/${sceneId}${window.location.search}`}
                sx={{ mt: 2 }}
                variant="contained"
                size="large"
            >
                Log in
            </Button>
        </Box>
    );
}
