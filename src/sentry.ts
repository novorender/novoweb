import * as Sentry from "@sentry/react";

Sentry.init({
    dsn: "https://aa8cbd1dd4c5a1c8f98896f00298d248@o4507333571248128.ingest.de.sentry.io/4507333580685392",
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions
    // Set 'tracePropagationTargets' to control for which URLs distributed tracing should be enabled
    tracePropagationTargets: [
        // "localhost", // For local Sentry debugging
        /^https:\/\/explorer\.novorender\.com/,
    ],
    // Session Replay
    replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
    replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});
