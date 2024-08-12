import { Box, FormControl, FormLabel, MenuItem, Select, SelectChangeEvent, SvgIcon } from "@mui/material";
import { useTranslation } from "react-i18next";

const LANGUAGES = {
    en: {
        nativeName: "English",
        flag: (
            <svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-us" viewBox="0 0 640 480">
                <path fill="#bd3d44" d="M0 0h640v480H0" />
                <path
                    stroke="#fff"
                    strokeWidth="37"
                    d="M0 55.3h640M0 129h640M0 203h640M0 277h640M0 351h640M0 425h640"
                />
                <path fill="#192f5d" d="M0 0h364.8v258.5H0" />
                <marker id="us-a" markerHeight="30" markerWidth="30">
                    <path fill="#fff" d="m14 0 9 27L0 10h28L5 27z" />
                </marker>
                <path
                    fill="none"
                    markerMid="url(#us-a)"
                    d="m0 0 16 11h61 61 61 61 60L47 37h61 61 60 61L16 63h61 61 61 61 60L47 89h61 61 60 61L16 115h61 61 61 61 60L47 141h61 61 60 61L16 166h61 61 61 61 60L47 192h61 61 60 61L16 218h61 61 61 61 60z"
                />
            </svg>
        ),
    },
    de: {
        nativeName: "Deutsch",
        flag: (
            <svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-de" viewBox="0 0 640 480">
                <path fill="#fc0" d="M0 320h640v160H0z" />
                <path fill="#000001" d="M0 0h640v160H0z" />
                <path fill="red" d="M0 160h640v160H0z" />
            </svg>
        ),
    },
    fr: {
        nativeName: "Français",
        flag: (
            <svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-fr" viewBox="0 0 640 480">
                <path fill="#fff" d="M0 0h640v480H0z" />
                <path fill="#000091" d="M0 0h213.3v480H0z" />
                <path fill="#e1000f" d="M426.7 0H640v480H426.7z" />
            </svg>
        ),
    },
    no: {
        nativeName: "Bokmål",
        flag: (
            <svg xmlns="http://www.w3.org/2000/svg" id="flag-icons-no" viewBox="0 0 640 480">
                <path fill="#ed2939" d="M0 0h640v480H0z" />
                <path fill="#fff" d="M180 0h120v480H180z" />
                <path fill="#fff" d="M0 180h640v120H0z" />
                <path fill="#002664" d="M210 0h60v480h-60z" />
                <path fill="#002664" d="M0 210h640v60H0z" />
            </svg>
        ),
    },
};

type Language = keyof typeof LANGUAGES;

export function LanguageSelector() {
    const { i18n, t } = useTranslation();

    const handleLanguageChange = (event: SelectChangeEvent<string>) => {
        const lang = event.target.value as Language;
        i18n.changeLanguage(lang);
    };

    return (
        <Box mx={1}>
            <FormControl fullWidth sx={{ mb: 1 }}>
                <FormLabel sx={{ fontWeight: 600, color: "text.primary", mb: 1 }} id="app-language">
                    {t("language")}
                </FormLabel>
                <Select id="app-language" value={i18n.language} onChange={handleLanguageChange} size="small" fullWidth>
                    {Object.entries(LANGUAGES).map(([lang, { nativeName, flag }]) => (
                        <MenuItem key={lang} value={lang} disabled={i18n.language === lang} dense>
                            <Box display="flex">
                                <SvgIcon sx={{ mr: 1 }}>{flag}</SvgIcon>
                                {nativeName}
                            </Box>
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>
        </Box>
    );
}
