import { useCallback, useEffect, useRef } from "react";

export const useAbortController = (reason = "aborted by useAbortController") => {
    const abortController = useRef(new AbortController());

    const abort = useCallback(() => {
        abortController.current.abort(reason);
        abortController.current = new AbortController();
    }, [abortController, reason]);

    useEffect(() => {
        return () => {
            abort();
        };
    }, [abort]);

    return [abortController, abort] as [abortController: typeof abortController, abort: typeof abort];
};
