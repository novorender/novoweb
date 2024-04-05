import { createContext, Dispatch, SetStateAction } from "react";

export const initialState = {
    objectIdToFormIdMap: new Map<number, { templateId: string; formId: string }>(),
};

type State = typeof initialState;

export type ContextType = {
    state: State;
    setState: Dispatch<SetStateAction<State>>;
};

export const Context = createContext<ContextType>(undefined as never);
