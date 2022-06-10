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
import { selectUserRole, UserRole } from "slices/explorerSlice";

export function User() {
    const [menuOpen, toggleMenu] = useToggle();
    const [minimized, toggleMinimize] = useToggle(false);

    const user = useAppSelector(selectUser);

    return (
        <>
            <WidgetContainer minimized={minimized}>
                <WidgetHeader minimized={minimized} toggleMinimize={toggleMinimize} widget={featuresConfig.user} />
                <ScrollBox p={1} mt={2} display={!menuOpen ? "flex" : "none"} flexDirection="column">
                    {user ? <LoggedIn user={user} /> : <LoggedOut />}
                </ScrollBox>
                <WidgetList
                    display={menuOpen ? "block" : "none"}
                    widgetKey={featuresConfig.user.key}
                    onSelect={toggleMenu}
                />
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

        if (msalInstance.getAllAccounts().length) {
            deleteFromStorage(StorageKey.MsalActiveAccount);
            msalInstance.logoutRedirect({ account: msalAccount });
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
                href={`${window.location.origin}/login/${sceneId}`}
                sx={{ mt: 2 }}
                variant="contained"
                size="large"
            >
                Log in
            </Button>
        </Box>
    );
}
