import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import Backend from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

i18n.use(Backend)
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        debug: import.meta.env.MODE !== "production",
        fallbackLng: "en",
        supportedLngs: ["en", "de", "fr", "no"],
        lowerCaseLng: true,
        interpolation: {
            escapeValue: false,
        },
    });

export default i18n;
