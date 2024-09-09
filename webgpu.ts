function identity() {
    return scaling(new Float32Array([1, 1, 1]));
}

function scaling(v: Float32Array) {
    // prettier-ignore
    return new Float32Array([
            v[0],    0,    0,   0, // <-- column 0
               0, v[1],    0,   0, // <-- column 1
               0,    0, v[2],   0, // <-- column 2
               0,    0,    0,   1  // <-- column 3
        ]);
}

function translation(v: Float32Array) {
    // prettier-ignore
    return new Float32Array([
               1,    0,    0,    0, // <-- column 0
               0,    1,    0,    0, // <-- column 1
               0,    0,    1,    0, // <-- column 2
            v[0], v[1], v[2],    1  // <-- column 3
        ]);
}

function multiply(lhs: Float32Array, rhs: Float32Array) {
    // prettier-ignore
    return new Float32Array([
            lhs[0] * rhs[0] + lhs[4] * rhs[1] + lhs[8] * rhs[2] + lhs[12] * rhs[3],
            lhs[1] * rhs[0] + lhs[5] * rhs[1] + lhs[9] * rhs[2] + lhs[13] * rhs[3],
            lhs[2] * rhs[0] + lhs[6] * rhs[1] + lhs[10] * rhs[2] + lhs[14] * rhs[3],
            lhs[3] * rhs[0] + lhs[7] * rhs[1] + lhs[11] * rhs[2] + lhs[15] * rhs[3],

            lhs[0] * rhs[4] + lhs[4] * rhs[5] + lhs[8] * rhs[6] + lhs[12] * rhs[7],
            lhs[1] * rhs[4] + lhs[5] * rhs[5] + lhs[9] * rhs[6] + lhs[13] * rhs[7],
            lhs[2] * rhs[4] + lhs[6] * rhs[5] + lhs[10] * rhs[6] + lhs[14] * rhs[7],
            lhs[3] * rhs[4] + lhs[7] * rhs[5] + lhs[11] * rhs[6] + lhs[15] * rhs[7],

            lhs[0] * rhs[8] + lhs[4] * rhs[9] + lhs[8] * rhs[10] + lhs[12] * rhs[11],
            lhs[1] * rhs[8] + lhs[5] * rhs[9] + lhs[9] * rhs[10] + lhs[13] * rhs[11],
            lhs[2] * rhs[8] + lhs[6] * rhs[9] + lhs[10] * rhs[10] + lhs[14] * rhs[11],
            lhs[3] * rhs[8] + lhs[7] * rhs[9] + lhs[11] * rhs[10] + lhs[15] * rhs[11],

            lhs[0] * rhs[12] + lhs[4] * rhs[13] + lhs[8] * rhs[14] + lhs[12] * rhs[15],
            lhs[1] * rhs[12] + lhs[5] * rhs[13] + lhs[9] * rhs[14] + lhs[13] * rhs[15],
            lhs[2] * rhs[12] + lhs[6] * rhs[13] + lhs[10] * rhs[14] + lhs[14] * rhs[15],
            lhs[3] * rhs[12] + lhs[7] * rhs[13] + lhs[11] * rhs[14] + lhs[15] * rhs[15]
        ]);
}

function scale(m: Float32Array, v: Float32Array) {
    return multiply(m, scaling(v));
}

function translate(m: Float32Array, v: Float32Array) {
    return multiply(m, translation(v));
}

async function renderer(canvasElement: HTMLCanvasElement) {
    /**
     *
     * WebGPU setup
     *
     */

    const adapter = await navigator.gpu.requestAdapter();

    if (!adapter) throw new Error('Unable to request adapter');

    const device = await adapter.requestDevice();

    if (!device) throw new Error('Unable to request device ');

    const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

    const canvasContext = canvasElement.getContext('webgpu');

    if (!canvasContext) throw new Error('Unable to get WebGPU canvas context');

    canvasContext.configure({ format: canvasFormat, device });

    // vertices data

    // prettier-ignore
    // 3--0
    // |  |
    // 2--1
    const verticesData = new Float32Array([
    //   clip space    texture
    //   x,  y,  z,    u, v
         1,  1,  1,    1, 0,  // 0
         1, -1,  1,    1, 1,  // 1
        -1, -1,  1,    0, 1,  // 2
        -1,  1,  1,    0, 0   // 3
    ]);

    const verticesBuffer: GPUBuffer = device.createBuffer({
        size: verticesData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(verticesBuffer, 0, verticesData);

    const verticesBufferLayout: GPUVertexBufferLayout = {
        arrayStride: 3 * 4 + 2 * 4,
        stepMode: 'vertex', // optional
        attributes: [
            {
                shaderLocation: 0,
                format: 'float32x3',
                offset: 0
            },
            {
                shaderLocation: 1,
                format: 'float32x2',
                offset: 3 * 4
            }
        ]
    };

    // vertices data indexing

    // prettier-ignore
    // 3 - - - 0
    // |     / |
    // |   /   |
    // | /     |
    // 2 - - - 1
    const indicesData = new Uint32Array([
        3, 2, 0,
        2, 1, 0
    ]);

    const indicesBuffer: GPUBuffer = device.createBuffer({
        size: indicesData.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(indicesBuffer, 0, indicesData);

    const indexFormat: GPUIndexFormat = 'uint32';

    // textures

    async function loadImageBitmap(url: string) {
        const res = await fetch(url);
        const blob = await res.blob();
        return await createImageBitmap(blob, { colorSpaceConversion: 'none' });
    }

    const url = '/avatar-1x.png';
    const source = await loadImageBitmap(url);

    const texture = device.createTexture({
        label: url,
        format: canvasFormat,
        size: [source.width, source.height],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST
    });

    device.queue.copyExternalImageToTexture({ source }, { texture }, { width: source.width, height: source.height });

    // depth texture

    let depthTexture = device.createTexture({
        size: [canvasElement.width, canvasElement.height],
        format: 'depth32float',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    });

    // uniforms - resolution

    const resolutionData = new Float32Array([canvasElement.width, canvasElement.height]);

    const resolutionBuffer: GPUBuffer = device.createBuffer({
        size: resolutionData.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(resolutionBuffer, 0, resolutionData);

    // uniforms - camera transformation matrix

    const cameraData = identity();

    const cameraBuffer = device.createBuffer({
        size: cameraData.byteLength,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(cameraBuffer, 0, cameraData);

    // bindings

    const bindGroupLayout: GPUBindGroupLayout = device.createBindGroupLayout({
        entries: [
            {
                binding: 0,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: 'uniform' }
            },
            {
                binding: 1,
                visibility: GPUShaderStage.VERTEX,
                buffer: { type: 'uniform' }
            },
            {
                binding: 2,
                visibility: GPUShaderStage.FRAGMENT,
                sampler: { type: 'filtering' }
            },
            {
                binding: 3,
                visibility: GPUShaderStage.FRAGMENT,
                texture: { sampleType: 'float' }
            }
        ]
    });

    const bindGroup = device.createBindGroup({
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: { buffer: resolutionBuffer }
            },
            {
                binding: 1,
                resource: { buffer: cameraBuffer }
            },
            {
                binding: 2,
                resource: device.createSampler()
            },
            {
                binding: 3,
                resource: texture.createView()
            }
        ]
    });

    // shaders

    const shaderModule: GPUShaderModule = device.createShaderModule({
        code: /* wgsl */ `

        @group(0) @binding(0) var<uniform> resolution: vec2f;
        @group(0) @binding(1) var<uniform> camera: mat4x4<f32>;

        struct VertexOutput {
            @builtin(position) position: vec4f,
            @location(0) texture_coords: vec2f,
        };

        @vertex fn vertex_main(@location(0) position: vec3f, @location(1) texture_coords: vec2f ) -> VertexOutput {


            var output: VertexOutput;
            output.position = camera * vec4f(position.xyz, 1.0);

            output.texture_coords = texture_coords;

            return output;
        }

        @group(0) @binding(2) var texture_sampler: sampler;
        @group(0) @binding(3) var texture: texture_2d<f32>;


        @fragment fn fragment_main(input: VertexOutput) -> @location(0) vec4f {
            return textureSample(texture, texture_sampler, input.texture_coords);
        }

        `
    });

    // pipeline

    const pipelineLayout: GPUPipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] });

    const pipeline: GPURenderPipeline = device.createRenderPipeline({
        layout: pipelineLayout,
        vertex: {
            module: shaderModule,
            buffers: [verticesBufferLayout]
        },
        fragment: {
            module: shaderModule,
            targets: [
                {
                    format: canvasFormat,
                    blend: {
                        color: {
                            srcFactor: 'src-alpha',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add'
                        },
                        alpha: {
                            srcFactor: 'one',
                            dstFactor: 'one-minus-src-alpha',
                            operation: 'add'
                        }
                    },
                    writeMask: GPUColorWrite.ALL
                }
            ]
        },
        depthStencil: {
            format: depthTexture.format,
            depthCompare: 'less-equal',
            depthWriteEnabled: true
        }
    });

    /**
     *
     * Resize canvas and contents correctly
     *
     */

    const maxTextureDimension = device.limits.maxTextureDimension2D;

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

    let ratio = resolutionData[0] / resolutionData[1];

    let needsResize = false;

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
     * Render loop
     *
     */
    function render() {
        if (!canvasContext) throw new Error('Canvas context lost');

        if (needsResize) {
            depthTexture = device.createTexture({
                size: resolutionData,
                format: depthTexture.format,
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
            });

            device.queue.writeBuffer(resolutionBuffer, 0, resolutionData);
        }

        device.queue.writeBuffer(cameraBuffer, 0, cameraData);

        const encoder = device.createCommandEncoder();

        const canvasView = canvasContext.getCurrentTexture().createView();
        const depthView = depthTexture.createView();

        const renderPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: canvasView,
                    loadOp: 'clear',
                    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                    storeOp: 'store'
                }
            ],
            depthStencilAttachment: {
                view: depthView,
                depthLoadOp: 'clear',
                depthClearValue: 1.0,
                depthStoreOp: 'store'
            }
        });

        renderPass.setPipeline(pipeline);

        renderPass.setVertexBuffer(0, verticesBuffer);
        renderPass.setIndexBuffer(indicesBuffer, indexFormat);

        renderPass.setBindGroup(0, bindGroup);

        renderPass.drawIndexed(indicesData.length);

        renderPass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
    }

    /**
     *
     * Main loop (main function return as Promise)
     *
     */
    function mainLoop(now: number) {
        update(now);
        render();
        requestAnimationFrame(mainLoop);
    }

    return mainLoop;
}

export { renderer };
