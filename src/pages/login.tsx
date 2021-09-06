import { useState, FormEvent } from "react";
import { useMsal } from "@azure/msal-react";
import { useTheme, Box, Paper, Typography, Button } from "@material-ui/core";

import { TextField } from "components";
import { loginRequest } from "config/auth";
import { useAppDispatch } from "app/store";
import { authActions } from "slices/authSlice";
import { login, storeToken } from "utils/auth";

// NOTE(OLA): Pending design

export function Login() {
    const theme = useTheme();
    const { instance } = useMsal();
    const dispatch = useAppDispatch();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    const handleAdRedirect = async () => {
        instance.loginRedirect({ ...loginRequest, prompt: "select_account" }).catch((e) => {
            console.warn(e);
        });
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        if (!username || !password) {
            return;
        }

        const res = await login(username, password).catch(() => ({ error: "" }));

        if ("token" in res) {
            storeToken(res.token);
            dispatch(authActions.login({ accessToken: res.token }));
        }
    };

    return (
        <Box
            height={"100vh"}
            bgcolor={theme.palette.secondary.main}
            display="flex"
            justifyContent="center"
            alignItems="center"
        >
            <Paper>
                <Box p={2} minWidth={320}>
                    <Box mb={2}>
                        <Typography variant="h4" component="h1" align="center">
                            Log in
                        </Typography>
                    </Box>
                    <form onSubmit={handleSubmit}>
                        <Box mb={1}>
                            <TextField
                                fullWidth
                                variant="outlined"
                                label="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                            />
                        </Box>
                        <Box mb={1}>
                            <TextField
                                fullWidth
                                variant="outlined"
                                label="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type="password"
                            />
                        </Box>
                        <Box display="flex" justifyContent="space-between" flexShrink={0}>
                            <Button type="button" fullWidth variant="contained" onClick={handleAdRedirect}>
                                Active Directory
                            </Button>
                            <Box width={1} ml={1} flexShrink={1.1}>
                                <Button type="submit" variant="contained" fullWidth color="secondary">
                                    Log in
                                </Button>
                            </Box>
                        </Box>
                    </form>
                </Box>
            </Paper>
        </Box>
    );
}
