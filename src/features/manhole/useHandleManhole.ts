import { useLoadCollisionResult } from "./useLoadCollisionResult";
import { useLoadCollisionTarget } from "./useLoadCollisionTarget";
import { useLoadManhole } from "./useLoadManhole";

export function useHandleManhole() {
    useLoadManhole();
    useLoadCollisionTarget();
    useLoadCollisionResult();
}
