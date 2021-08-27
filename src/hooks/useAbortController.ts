import { useCallback, useEffect, useRef } from "react";

export const useAbortController = () => {
    const abortController = useRef(new AbortController());

    const abort = useCallback(() => {
        abortController.current.abort();
        abortController.current = new AbortController();
    }, [abortController]);

    useEffect(() => {
        return () => {
            abort();
        };
    }, [abort]);

    return [abortController, abort] as [abortController: typeof abortController, abort: typeof abort];
};
