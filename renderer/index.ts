async function main() {
    const adapter = (await navigator.gpu.requestAdapter())!;

    const device = (await adapter.requestDevice())!;

    const format = navigator.gpu.getPreferredCanvasFormat();

    const canvas = document.querySelector('canvas')!;

    const context = canvas.getContext('webgpu')!;

    context.configure({ format, device });

    // prettier-ignore
    const verticesData = new Float32Array([
         1,  1,
         1, -1,
        -1, -1,
        -1,  1
    ]);

    const vertexBuffer: GPUBuffer = device.createBuffer({
        size: verticesData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(vertexBuffer, 0, verticesData);

    const vertexBufferLayout: GPUVertexBufferLayout = {
        arrayStride: 2 * 4,
        attributes: [
            {
                shaderLocation: 0,
                format: 'float32x2',
                offset: 0
            }
        ]
    };

    const indexData = new Uint32Array([2, 1, 0, 2, 0, 3]);

    const indexBuffer: GPUBuffer = device.createBuffer({
        size: indexData.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(indexBuffer, 0, indexData);

    const indexFormat: GPUIndexFormat = 'uint32';

    const shaderModule: GPUShaderModule = device.createShaderModule({
        code: /* wgsl */ `
        @vertex fn vertex_main(@location(0) position: vec2f) -> @builtin(position) vec4f {
            return vec4f(position, 0.0, 1.0);
        }

        @fragment fn fragment_main(@builtin(position) position: vec4f) -> @location(0) vec4f {
            return vec4f(0.0, 0.0, 0.0, 1);
        }
    `
    });

    const pipelineLayout: GPUPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [] });

    const pipeline: GPURenderPipeline = device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
            module: shaderModule,
            buffers: [vertexBufferLayout]
        },
        fragment: {
            module: shaderModule,
            targets: [{ format }]
        }
    });

    function render() {
        resizeCanvasToDisplaySize(canvas);

        const encoder = device.createCommandEncoder();

        const view = context.getCurrentTexture().createView();

        const renderPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view,
                    loadOp: 'clear',
                    clearValue: { r: 1.0, g: 1.0, b: 1.0, a: 1.0 },
                    storeOp: 'store'
                }
            ]
        });

        renderPass.setPipeline(pipeline);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setIndexBuffer(indexBuffer, indexFormat);

        renderPass.drawIndexed(indexData.length);

        renderPass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);

        requestAnimationFrame(render);
    }

    const canvasToSizeMap = new WeakMap();

    function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
        // Get the canvas's current display size
        let { width, height } = canvasToSizeMap.get(canvas) || canvas;

        // Make sure it's valid for WebGPU
        width = Math.max(1, Math.min(width, device.limits.maxTextureDimension2D));
        height = Math.max(1, Math.min(height, device.limits.maxTextureDimension2D));

        // Only if the size is different, set the canvas size
        const needResize = canvas.width !== width || canvas.height !== height;
        if (needResize) {
            canvas.width = width;
            canvas.height = height;
        }
        return needResize;
    }

    const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
            canvasToSizeMap.set(entry.target, {
                width: entry.contentBoxSize[0]?.inlineSize,
                height: entry.contentBoxSize[0]?.blockSize
            });
        }
        render();
    });
    observer.observe(canvas);
}

main();

console.log('done', new Date());

export { main };
