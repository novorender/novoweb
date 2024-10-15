import mp from "mixpanel-browser";

export let mixpanel: typeof mp | null = null;

export function initMixpanel(token: string) {
    if (token) {
        mp.init(token, {
            debug: import.meta.env.MODE !== "production",
            track_pageview: false, // event is sent in useHandleInit
            persistence: "localStorage",
        });

        mixpanel = mp;
    }
}
