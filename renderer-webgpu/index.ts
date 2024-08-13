import { identity, translate } from './mat4';

async function renderer(canvasElement: HTMLCanvasElement) {
    // setup

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

    const vertexBuffer: GPUBuffer = device.createBuffer({
        size: verticesData.byteLength,
        usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(vertexBuffer, 0, verticesData);

    const vertexBufferLayout: GPUVertexBufferLayout = {
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

    // indexing

    // prettier-ignore
    // 3 - - - 0
    // |     / |
    // |   /   |
    // | /     |
    // 2 - - - 1
    const indexData = new Uint32Array([
        3, 2, 0,
        2, 1, 0
    ]);

    const indexBuffer: GPUBuffer = device.createBuffer({
        size: indexData.byteLength,
        usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });

    device.queue.writeBuffer(indexBuffer, 0, indexData);

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

            var ratio = resolution.x / resolution.y;

            var output: VertexOutput;
            output.position = camera * vec4f( 0.2 * position.x / ratio,  0.2 * position.y, position.z, 1.0);

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
            buffers: [vertexBufferLayout]
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

    // resize

    const canvasToSizeMap = new WeakMap<Element, { width: number; height: number }>();
    const maxTextureDimension = device.limits.maxTextureDimension2D;

    function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement) {
        // Get the canvas's current display size
        let { width, height } = canvasToSizeMap.get(canvas) || canvas;

        // Make sure it's valid for WebGPU
        width = Math.max(1, Math.min(width ?? maxTextureDimension, maxTextureDimension));
        height = Math.max(1, Math.min(height ?? maxTextureDimension, maxTextureDimension));

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
            const contentBoxSize = entry.contentBoxSize[0];

            if (!contentBoxSize) continue;

            canvasToSizeMap.set(entry.target, {
                width: contentBoxSize.inlineSize,
                height: contentBoxSize.blockSize
            });
        }
    });

    observer.observe(canvasElement);

    let lastUpdate = performance.now();

    let needsResize = false;

    function update() {
        const now = performance.now();

        needsResize = resizeCanvasToDisplaySize(canvasElement);

        const delta = now - lastUpdate;

        const v = new Float32Array([0.8 * Math.cos(now / 500), 0.8 * Math.sin(now / 500), 0]);

        const m = translate(identity(), new Float32Array(v));

        cameraData.set(m);

        lastUpdate = now;
    }

    // render

    function render() {
        if (!canvasContext) throw new Error('Canvas context lost');
        if (needsResize) {
            depthTexture = device.createTexture({
                size: [canvasElement.width, canvasElement.height],
                format: depthTexture.format,
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING
            });

            resolutionData.set([canvasElement.width, canvasElement.height]);
            device.queue.writeBuffer(resolutionBuffer, 0, resolutionData);
        }

        device.queue.writeBuffer(cameraBuffer, 0, cameraData);

        const encoder = device.createCommandEncoder();

        const renderPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: canvasContext.getCurrentTexture().createView(),
                    loadOp: 'clear',
                    clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
                    storeOp: 'store'
                }
            ],
            depthStencilAttachment: {
                view: depthTexture.createView(),
                depthLoadOp: 'clear',
                depthClearValue: 1.0,
                depthStoreOp: 'store'
            }
        });

        renderPass.setPipeline(pipeline);

        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.setIndexBuffer(indexBuffer, indexFormat);

        renderPass.setBindGroup(0, bindGroup);

        renderPass.drawIndexed(indexData.length);

        renderPass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
    }

    function mainLoop() {
        update();
        render();
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
