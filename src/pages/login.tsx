import { useState, FormEvent } from "react";
import { useMsal } from "@azure/msal-react";
import { useTheme, Box, Button, OutlinedInput, IconButton, InputAdornment, FormControl } from "@mui/material";

import { loginRequest } from "config/auth";
import { useAppDispatch } from "app/store";
import { authActions } from "slices/authSlice";
import { login, storeToken } from "utils/auth";
import { useToggle } from "hooks/useToggle";

import { Lock, Visibility, VisibilityOff, AccountCircle } from "@mui/icons-material";
import { ReactComponent as NovorenderLogo } from "media/img/novorender_logo_RGB_2021.svg";

export function Login() {
    const theme = useTheme();
    const { instance } = useMsal();
    const dispatch = useAppDispatch();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, toggleShowPassword] = useToggle(false);

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
        <Box height={"100vh"} bgcolor={{ xs: theme.palette.common.white, sm: theme.palette.grey[200] }}>
            <Box p={3} textAlign={{ xs: "center", sm: "left" }}>
                <NovorenderLogo title="novorender" height={35} fill={theme.palette.primary.main} />
            </Box>

            <Box
                p={2}
                maxWidth={430}
                maxHeight={{ xs: "auto", sm: 512 }}
                width={1}
                height={1}
                borderRadius="4px"
                bgcolor={theme.palette.common.white}
                py={{ xs: 2, sm: 8.5 }}
                px={{ xs: 2, sm: 8 }}
                mx="auto"
                mt={{ xs: 0, sm: 13 }}
            >
                <Box mb={2} fontSize={24} fontWeight={700} textAlign="center" component="h1">
                    Log in
                </Box>
                <form onSubmit={handleSubmit}>
                    <Box mb={2}>
                        <FormControl fullWidth>
                            <label htmlFor="username">Username</label>
                            <OutlinedInput
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                type="text"
                                startAdornment={
                                    <InputAdornment position="start">
                                        <AccountCircle htmlColor={theme.palette.grey[600]} />
                                    </InputAdornment>
                                }
                            />
                        </FormControl>
                    </Box>
                    <Box mb={3}>
                        <FormControl fullWidth>
                            <label htmlFor="password">Password</label>
                            <OutlinedInput
                                id="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type={showPassword ? "text" : "password"}
                                startAdornment={
                                    <InputAdornment position="start">
                                        <Lock htmlColor={theme.palette.grey[600]} />
                                    </InputAdornment>
                                }
                                endAdornment={
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password visibility"
                                            onClick={toggleShowPassword}
                                            size="large"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                }
                            />
                        </FormControl>
                    </Box>
                    <Box mb={2}>
                        <Button type="submit" variant="contained" fullWidth color="primary" size="large">
                            Log in
                        </Button>
                    </Box>
                    <Button
                        type="button"
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        size="large"
                        onClick={handleAdRedirect}
                    >
                        Active Directory
                    </Button>
                </form>
            </Box>
        </Box>
    );
}
