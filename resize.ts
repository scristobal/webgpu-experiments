/**
 *
 * Resize canvas and contents correctly
 *
 */

function resizeHandler(maxTextureDimension: number, canvasElement: HTMLCanvasElement) {
    const canvasDisplaySize = { width: 0, height: 0 };

    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const contentBoxSize = entry.contentBoxSize[0];

            if (!contentBoxSize) continue;

            canvasDisplaySize.width = Math.max(1, Math.min(contentBoxSize.inlineSize, maxTextureDimension));
            canvasDisplaySize.height = Math.max(1, Math.min(contentBoxSize.blockSize, maxTextureDimension));
        }
    });

    observer.observe(canvasElement);

    return {
        resolution: new Float32Array([canvasElement.width, canvasElement.height]),

        get needsResize() {
            const needResize = canvasElement.width !== canvasDisplaySize.width || canvasElement.height !== canvasDisplaySize.height;

            if (needResize) {
                canvasElement.width = canvasDisplaySize.width;
                canvasElement.height = canvasDisplaySize.height;
                this.resolution[0] = canvasElement.width;
                this.resolution[1] = canvasElement.height;
            }

            return needResize;
        }
    };
}

export { resizeHandler };
