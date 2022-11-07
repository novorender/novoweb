import { Scene } from "@novorender/webgl-api";
import { quat, vec2, vec3 } from "gl-matrix";
import { searchByPatterns } from "./search";

interface MinimapInfo {
    aspect: number;
    elevation: number;
    image: string;
    corner: vec3;
    dx: number;
    dy: number;
    dirX: vec3;
    dirY: vec3;
}

export class MinimapHelper {
    pixelWidth = 0;
    pixelHeight = 0;
    currentIndex = 0;
    constructor(readonly minimaps: MinimapInfo[]) {}
    toMinimap(worldPos: vec3): vec2 {
        const curInfo = this.getCurrentInfo();
        const diff = vec3.sub(vec3.create(), worldPos, curInfo.corner);
        const diffX = vec3.dot(diff, curInfo.dirX);
        const diffY = vec3.dot(diff, curInfo.dirY);
        const x = (diffX / curInfo.dx) * this.pixelWidth;
        const y = this.pixelHeight - (diffY / curInfo.dy) * this.pixelHeight;
        return vec2.fromValues(x, y);
    }

    toWorld(minimapPos: vec2): vec3 {
        const curInfo = this.getCurrentInfo();
        const diffX = minimapPos[0] / this.pixelWidth;
        const diffY = 1 - minimapPos[1] / this.pixelHeight;
        const pos = vec3.clone(curInfo.corner);
        pos[1] += 2;
        vec3.scaleAndAdd(pos, pos, curInfo.dirX, curInfo.dx * diffX);
        vec3.scaleAndAdd(pos, pos, curInfo.dirY, curInfo.dy * diffY);
        return pos;
    }

    directionPoints(worldPos: vec3, rot: quat): vec2[] {
        const path: vec2[] = [];
        path.push(this.toMinimap(worldPos));
        const rotA = quat.rotateY(quat.create(), rot, Math.PI / 8);
        const dirZ = vec3.fromValues(0, 0, -1);
        const dirA = vec3.transformQuat(vec3.create(), dirZ, rotA);
        const posA = vec3.scaleAndAdd(vec3.create(), worldPos, dirA, 10);
        path.push(this.toMinimap(posA));

        const rotB = quat.rotateY(quat.create(), rot, -Math.PI / 8);
        const dirB = vec3.transformQuat(vec3.create(), dirZ, rotB);
        const posB = vec3.scaleAndAdd(vec3.create(), worldPos, dirB, 10);
        path.push(this.toMinimap(posB));

        return path;
    }

    getCurrentInfo() {
        return this.minimaps[this.currentIndex];
    }

    getMinimapImage() {
        return this.getCurrentInfo().image;
    }

    getAspect() {
        return this.getCurrentInfo().aspect;
    }

    update(camPos: vec3): boolean {
        for (let i = 1; i < this.minimaps.length; ++i) {
            if (camPos[1] < this.minimaps[i].elevation) {
                if (i !== this.currentIndex) {
                    this.currentIndex = i;
                    return true;
                }
                return false;
            }
        }
        if (this.currentIndex !== this.minimaps.length - 1) {
            this.currentIndex = this.minimaps.length - 1;
            return true;
        }
        return false;
    }
}

export async function downloadMinimap(scene: Scene): Promise<MinimapHelper> {
    const minimaps: MinimapInfo[] = [];

    await searchByPatterns({
        scene,
        searchPatterns: [{ property: "Novorender/Document/Corners", exact: true }],
        callback: async (refs) => {
            for (const ref of refs) {
                const data = await ref.loadMetaData();
                let corner = vec3.create();
                const dirX = vec3.create();
                const dirY = vec3.create();
                let dx = 0;
                let dy = 0;
                let aspect = 0;
                let elevation = 0;
                let image = "";
                for (const prop of data.properties) {
                    if (prop[0] === "Novorender/Document/Corners") {
                        const points = prop[1].split("]");
                        const c1 = points[0].replaceAll("[", "").split(",");
                        const c2 = points[1].replaceAll("[", "").split(",");
                        const c3 = points[2].replaceAll("[", "").split(",");
                        const a = vec3.fromValues(Number(c1[0]), Number(c1[1]), Number(c1[2]));
                        const b = vec3.fromValues(Number(c2[1]), Number(c2[2]), Number(c2[3]));
                        const c = vec3.fromValues(Number(c3[1]), Number(c3[2]), Number(c3[3]));
                        vec3.sub(dirX, b, a);
                        dx = vec3.len(dirX);
                        vec3.normalize(dirX, dirX);
                        vec3.sub(dirY, c, b);
                        dy = vec3.len(dirY);
                        vec3.normalize(dirY, dirY);
                        corner = vec3.clone(a);
                        elevation = a[1];
                        aspect = dx / dy;
                    } else if (prop[0] === "Novorender/Document/Preview") {
                        image = prop[1];
                    }
                }
                minimaps.push({
                    aspect,
                    image,
                    dx,
                    dy,
                    corner,
                    dirX,
                    dirY,
                    elevation,
                });
            }
        },
        full: true,
    });

    minimaps.sort((a, b) => a.elevation - b.elevation);
    return new MinimapHelper(minimaps);
}
