import { useLoadManhole } from "./useLoadManhole";
import { useLoadCollisionTarget } from "./useLoadCollisionTarget";
import { useLoadCollisionResult } from "./useLoadCollisionResult";

export function useHandleManholeUpdates() {
    useLoadManhole();
    useLoadCollisionTarget();
    useLoadCollisionResult();
}
