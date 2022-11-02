import { mat4, quat, vec2, vec3 } from "gl-matrix";
import * as GLTF from "./gltf_types";

interface MinimapInfo {
    aspect: number;
    elevation: number;
    image: Blob;
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

function getImageBlob(image: GLTF.Image, gltf: GLTF.GlTf, buffers: ArrayBuffer) {
    const bufferView = gltf.bufferViews![image.bufferView!];
    const begin = bufferView.byteOffset ?? 0;
    const end = bufferView.byteLength ? begin + bufferView.byteLength : undefined;
    const buffer = buffers.slice(begin, end);
    return new Blob([buffer]);
}

const BINARY_HEADER_MAGIC = "glTF";
const BINARY_HEADER_LENGTH = 12;
const BINARY_CHUNK_TYPES = { JSON: 0x4e4f534a, BIN: 0x004e4942 };

export async function downloadMinimap(assetUrl: string): Promise<MinimapHelper> {
    const pdfGlbUrl = new URL(assetUrl);
    pdfGlbUrl.pathname += "gltf/03.glb";
    const response = await fetch(pdfGlbUrl.toString(), { mode: "cors" });
    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}: ${response.statusText}`);
    }
    const glb = await response.arrayBuffer();
    const { json, buffer } = parseGLB(glb);
    const gltf = JSON.parse(json) as GLTF.GlTf;

    const images =
        gltf.images?.map((img) => {
            let blob = getImageBlob(img, gltf, buffer);
            if (img.mimeType) {
                blob = new Blob([blob], { type: img.mimeType });
            }
            return blob;
        }) ?? [];

    const minimaps: MinimapInfo[] = [];

    if (gltf.nodes) {
        for (let i = 0; i < gltf.nodes.length; ++i) {
            let transform = mat4.identity(mat4.create());
            const dirX = vec3.create();
            const dirY = vec3.create();

            if (gltf.nodes[0].matrix) {
                const mat = gltf.nodes[0].matrix;
                transform = mat4.fromValues(
                    mat[0],
                    mat[1],
                    mat[2],
                    mat[3],
                    mat[4],
                    mat[5],
                    mat[6],
                    mat[7],
                    mat[8],
                    mat[9],
                    mat[10],
                    mat[11],
                    mat[12],
                    mat[13],
                    mat[14],
                    mat[15]
                );
            }
            const meshIdx = gltf.nodes[0].mesh;
            if (meshIdx !== undefined && gltf.meshes) {
                const mesh = gltf.meshes[meshIdx];
                if (mesh.primitives.length > 0) {
                    const primitive = mesh.primitives[0];
                    if (primitive.indices !== undefined && gltf.accessors && gltf.bufferViews) {
                        const idxAcc = gltf.accessors[primitive.indices];
                        if (idxAcc.count > 2) {
                            const bufferView = gltf.bufferViews[idxAcc!.bufferView as number];
                            const begin = bufferView.byteOffset ?? 0;
                            const end = bufferView.byteLength ? begin + bufferView.byteLength : undefined;
                            const idxBuffer = new Uint32Array(buffer.slice(begin, end));
                            for (const attribute in primitive.attributes) {
                                if (attribute === "POSITION") {
                                    const val = primitive.attributes[attribute];
                                    const posAcc = gltf.accessors[val];
                                    const posBufferView = gltf.bufferViews[posAcc!.bufferView as number];
                                    const posBegin = posBufferView.byteOffset ?? 0;
                                    const posEnd = posBufferView.byteLength
                                        ? posBegin + posBufferView.byteLength
                                        : undefined;
                                    const posBuffer = new Float32Array(buffer.slice(posBegin, posEnd));
                                    const idxA = idxBuffer[0];
                                    const idxB = idxBuffer[1] * 3;
                                    const idxC = idxBuffer[2] * 3;

                                    const a = vec3.fromValues(
                                        posBuffer[idxA],
                                        posBuffer[idxA + 1],
                                        posBuffer[idxA + 2]
                                    );
                                    const b = vec3.fromValues(
                                        posBuffer[idxB],
                                        posBuffer[idxB + 1],
                                        posBuffer[idxB + 2]
                                    );
                                    const c = vec3.fromValues(
                                        posBuffer[idxC],
                                        posBuffer[idxC + 1],
                                        posBuffer[idxC + 2]
                                    );
                                    vec3.sub(dirX, b, a);
                                    const dx = vec3.len(dirX);
                                    vec3.normalize(dirX, dirX);
                                    vec3.sub(dirY, c, b);
                                    const dy = vec3.len(dirY);
                                    vec3.normalize(dirY, dirY);
                                    const corner = vec3.clone(a);
                                    vec3.transformMat4(corner, corner, transform);
                                    const aspect = dx / dy;
                                    minimaps.push({
                                        aspect,
                                        image: images[0],
                                        dx,
                                        dy,
                                        corner,
                                        dirX,
                                        dirY,
                                        elevation: a[1],
                                    });
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    minimaps.sort((a, b) => a.elevation - b.elevation);

    // const childImages: Blob[] = [];
    // childImages.push(...(await loadChildImage(assetUrl, "gltf/030.glb")));
    // childImages.push(...(await loadChildImage(assetUrl, "gltf/031.glb")));
    // childImages.push(...(await loadChildImage(assetUrl, "gltf/032.glb")));
    // childImages.push(...(await loadChildImage(assetUrl, "gltf/033.glb")));
    return new MinimapHelper(minimaps);
}

function parseGLB(data: ArrayBuffer) {
    const headerView = new DataView(data, 0, BINARY_HEADER_LENGTH);
    const decoder = new TextDecoder();

    const header = {
        magic: decoder.decode(new Uint8Array(data, 0, 4)),
        version: headerView.getUint32(4, true),
        length: headerView.getUint32(8, true),
    };

    if (header.magic !== BINARY_HEADER_MAGIC) {
        throw new Error("Unsupported glTF-Binary header.");
    } else if (header.version < 2.0) {
        throw new Error("Unsupported legacy gltf file detected.");
    }

    let json: string | undefined;
    let buffer: ArrayBuffer | undefined;
    const chunkView = new DataView(data, BINARY_HEADER_LENGTH);
    let chunkIndex = 0;
    while (chunkIndex < chunkView.byteLength) {
        const chunkLength = chunkView.getUint32(chunkIndex, true);
        chunkIndex += 4;
        const chunkType = chunkView.getUint32(chunkIndex, true);
        chunkIndex += 4;
        if (chunkType === BINARY_CHUNK_TYPES.JSON) {
            const contentArray = new Uint8Array(data, BINARY_HEADER_LENGTH + chunkIndex, chunkLength);
            json = decoder.decode(contentArray);
            json = json.substr(0, json.lastIndexOf("}") + 1);
        } else if (chunkType === BINARY_CHUNK_TYPES.BIN) {
            const contentArray = new Uint8Array(data, BINARY_HEADER_LENGTH + chunkIndex, chunkLength);
            const binaryChunk = new Uint8Array(chunkLength);
            binaryChunk.set(contentArray);
            buffer = binaryChunk.buffer;
        }
        chunkIndex += chunkLength; // Clients must ignore chunks with unknown types.
    }

    if (!json) {
        throw new Error("glTF-Binary: JSON content not found.");
    }
    if (!buffer) {
        throw new Error("glTF-Binary: Binary chunk not found.");
    }
    return { json, buffer };
}
