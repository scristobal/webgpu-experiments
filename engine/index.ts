import { identity, scaling, translate } from './mat4';

async function renderer(canvasElement: HTMLCanvasElement) {
    // vertices data - position coordinates

    // prettier-ignore
    // 3--0
    // |  |
    // 2--1
    const verticesPositionData = new Float32Array([
        //   clip space
        //   x,  y,  z,
             1,  1,  0, // 0
             1, -1,  0, // 1
            -1, -1,  0, // 2
            -1,  1,  0, // 3
    ]);

    // vertices data - texture coordinates

    // prettier-ignore
    // 3--0
    // |  |
    // 2--1
    const verticesTextureData = new Float32Array([
        // texture
        //  u, v
        1, 0,  // 0
        1, 1,  // 1
        0, 1,  // 2
        0, 0   // 3
    ]);

    // prettier-ignore
    // 3 - - - 0
    // |     / |
    // |   /   |
    // | /     |
    // 2 - - - 1
    const indicesData = new Uint16Array([
        3, 2, 0,
        2, 1, 0,
    ]);

    /**
     *
     * Load uniforms into the program
     *
     */

    // uniforms - resolution

    const resolutionData = new Float32Array([canvasElement.width, canvasElement.height]);

    // uniforms - camera transformation matrix

    const cameraData = identity();

    // uniforms - texture

    async function loadImageBitmap(url: string) {
        const res = await fetch(url);
        const blob = await res.blob();
        return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
    }

    const source = await loadImageBitmap('/avatar-1x.png');

    /**
     *
     * Resize canvas and contents correctly
     *
     */

    const maxTextureDimension = 0;

    const resizeCanvasToDisplaySize = ((maxTextureDimension: number) => {
        const canvasToSizeMap = new WeakMap<Element, { width: number; height: number }>();

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const contentBoxSize = entry.contentBoxSize[0];

                if (!contentBoxSize) continue;

                canvasToSizeMap.set(entry.target, {
                    width: contentBoxSize.inlineSize,
                    height: contentBoxSize.blockSize
                });
            }
        });

        observer.observe(canvasElement);

        return (canvas: HTMLCanvasElement) => {
            let { width, height } = canvasToSizeMap.get(canvas) || canvas;

            width = Math.max(1, Math.min(width ?? maxTextureDimension, maxTextureDimension));
            height = Math.max(1, Math.min(height ?? maxTextureDimension, maxTextureDimension));

            const needResize = canvas.width !== width || canvas.height !== height;

            if (needResize) {
                canvas.width = width;
                canvas.height = height;
            }

            return needResize;
        };
    })(maxTextureDimension);

    /**
     *
     * Update loop
     *
     */

    let lastUpdate = performance.now();

    let needsResize = false;

    let ratio = resolutionData[0] / resolutionData[1];

    let angle = 0;

    function update(now: number) {
        needsResize = resizeCanvasToDisplaySize(canvasElement);

        if (needsResize) {
            resolutionData.set([canvasElement.width, canvasElement.height]);
            ratio = resolutionData[0] / resolutionData[1];
        }

        const delta = now - lastUpdate;

        angle += delta / 100;

        const v = new Float32Array([0.8 * Math.cos(angle), 0.8 * Math.sin(angle), 0]);

        const m = translate(scaling(new Float32Array([0.2 / ratio, 0.2, 1])), new Float32Array(v));

        cameraData.set(m);

        lastUpdate = now;
    }

    /**
     *
     * Main loop (main function return as Promise)
     *
     */
    function mainLoop(now: number) {
        update(now);
        requestAnimationFrame(mainLoop);
    }

    return mainLoop;
}

const version = import.meta.env.VITE_APP_VERSION;
console.log(`Using version ${version}`);

const canvasElement = document.querySelector('canvas') ?? document.createElement('canvas');

if (!document.contains(canvasElement)) document.body.append(canvasElement);

renderer(canvasElement)
    .then(requestAnimationFrame)
    .catch(console.error)
    .finally(() => console.log('done', new Date()));
