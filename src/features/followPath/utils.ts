import { Scene } from "@novorender/webgl-api";

import { Brep, Nurbs } from "./followPathSlice";

export function getNurbs({ scene, objectId }: { scene: Scene; objectId: number }): Promise<Nurbs> {
    const url = new URL((scene as any).assetUrl);
    url.pathname += `brep/${objectId}.json`;

    return fetch(url.toString())
        .then((r) => r.json())
        .then(
            (brep: Brep) =>
                ({
                    kind: "nurbs",
                    order: 0,
                    knots: [
                        ...brep.geometries[0].compoundCurve.map((cCurve) =>
                            brep.curves3D[brep.curveSegments[cCurve].curve3D].knots.slice(1)
                        ),
                    ].flat(),
                    controlPoints: [
                        ...brep.geometries[0].compoundCurve.map((cCurve) =>
                            brep.curves3D[brep.curveSegments[cCurve].curve3D].controlPoints.map((cp) => [
                                cp[0],
                                cp[2],
                                -cp[1],
                            ])
                        ),
                    ].flat(),
                } as Nurbs)
        );
}
