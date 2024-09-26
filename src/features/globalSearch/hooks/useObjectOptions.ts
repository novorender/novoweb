import { SearchPattern } from "@novorender/webgl-api";
import { useEffect, useMemo, useState } from "react";

import { useExplorerGlobals } from "contexts/explorerGlobals";

import { Category, OptionObject } from "../types";

const emptyObjectOptions: OptionObject[] = [];

export function useObjectOptions(term: string) {
    const {
        state: { db },
    } = useExplorerGlobals(false);
    const [objects, setObjects] = useState<OptionObject[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const cleanTerm = term.trim().toLowerCase();
        if (cleanTerm.length < 3) {
            setObjects(emptyObjectOptions);
            setLoading(false);
            return;
        }

        const state = {
            timeout: null as null | ReturnType<typeof setTimeout>,
            abortController: null as null | AbortController,
        };

        state.timeout = setTimeout(() => {
            state.timeout = null;
            search(cleanTerm);
        }, 1000);

        async function search(term: string) {
            if (!db) {
                return;
            }

            const abort = new AbortController();
            state.abortController = abort;

            setLoading(true);
            let searchPattern: SearchPattern[] | string;
            if (term.includes("=")) {
                const [property, rawValue] = term.split("=", 2).map((e) => e.trim());
                let exact = false;
                let value = rawValue;
                if (value.endsWith("!")) {
                    exact = true;
                    value = value.slice(0, value.length - 1);
                }
                searchPattern = [{ property, value, exact }];
            } else {
                searchPattern = term;
            }

            setLoading(true);

            const iter = db.search(
                {
                    searchPattern,
                    full: true,
                },
                abort.signal,
            );

            const result: OptionObject[] = [];
            for await (const obj of iter) {
                const meta = await obj.loadMetaData();

                let match: string | undefined = undefined;
                if (typeof searchPattern === "string") {
                    if (!meta.name.toLowerCase().includes(searchPattern)) {
                        const prop = meta.properties.find(
                            (p) =>
                                p[0].toLowerCase().includes(searchPattern) ||
                                p[1].toLowerCase().includes(searchPattern),
                        );
                        if (prop) {
                            match = `${prop[0]}=${prop[1]}`;
                        }
                    }
                } else {
                    const prop = meta.properties.find((p) => p[0] === searchPattern[0].property);
                    if (prop) {
                        match = `${prop[0]}=${prop[1]}`;
                    }
                }

                result.push({
                    id: `object-${obj.id}`,
                    label: meta.name,
                    object: obj,
                    match,
                    category: Category.Object,
                });

                if (result.length >= 100) {
                    break;
                }
            }

            state.abortController = null;
            setObjects(result);
            setLoading(false);
        }

        return () => {
            if (state.timeout) {
                clearTimeout(state.timeout);
            }
            state.abortController?.abort();
            setLoading(false);
        };
    }, [db, term]);

    return useMemo(() => [objects, loading] as const, [objects, loading]);
}
