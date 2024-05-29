import * as Sentry from "@sentry/react";

Sentry.init({
    dsn: "https://aa8cbd1dd4c5a1c8f98896f00298d248@o4507333571248128.ingest.de.sentry.io/4507333580685392",
    environment: import.meta.env.MODE === "development" ? "development" : "production",
    integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration(),
        Sentry.httpClientIntegration({
            failedRequestStatusCodes: [
                [400, 403],
                [405, 499],
                [500, 599],
            ],
        }),
        Sentry.sessionTimingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    // tracePropagationTargets: [
    //     "localhost",
    //     /^https:\/\/explorer\.novorender\.com/,
    // ],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
    ignoreErrors: [
        "aborted by useAbortController", // no longer relevant requests
        "Download aborted!", // pausing offline sync
    ],
});
