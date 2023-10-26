import { useEffect, useRef } from "react";

export function useIsMounted(): { readonly current: boolean } {
    const isMounted = useRef(false);

    useEffect(() => {
        isMounted.current = true;

        return () => {
            isMounted.current = false;
        };
    }, []);

    return isMounted;
}
