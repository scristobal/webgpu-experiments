/**
 * Sample GPU app from Google's I/O 2023
 * https://codelabs.developers.google.com/your-first-webgpu-app
 *
 * Samuel Cristobal, May 2023
 */

// get GPU device
if (!navigator.gpu) {
    throw new Error('WebGPU not supported on this browser.');
}

const adapter = await navigator.gpu.requestAdapter();

if (!adapter) {
    throw new Error('No appropriate GPUAdapter found.');
}

const device = await adapter.requestDevice();

// attach device to html canvas
const canvasFormat = navigator.gpu.getPreferredCanvasFormat();

const canvas = document.querySelector('canvas');

if (!canvas) {
    throw new Error('No canvas found.');
}

const context = canvas.getContext('webgpu');

if (!context) {
    throw new Error('No WebGPU context found.');
}

context.configure({
    device: device,
    format: canvasFormat,
});

// prepare data

// x, y pairs grouped in points: p1, p2, p3, q1, q2, q3
// triplets of points grouped in triangles
const vertices = new Float32Array([
    -0.8, -0.8, 0.8, -0.8, 0.8, 0.8, -0.8, -0.8, 0.8, 0.8, -0.8, 0.8,
]); // exercise: use Index Buffers to avoid repetition

// copy data into the GPU
const vertexBuffer = device.createBuffer({
    label: 'Cell vertices',
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
// actually moves the data
device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/ 0, vertices);

// tells the GPU how is the data organized
const vertexBufferLayout = {
    arrayStride: 8,
    attributes: [
        {
            format: 'float32x2' as const,
            offset: 0,
            shaderLocation: 0, // Position, see vertex shader
        },
    ],
};

// write the shaders
const cellShaderModule = device.createShaderModule({
    label: 'Cell shader',
    code: /* wgsl */ `
        @vertex
        fn vertexMain(@location(0) pos: vec2f) ->
            @builtin(position) vec4f {
            return vec4f(pos, 0, 1);
        }

        @fragment
        fn fragmentMain() -> @location(0) vec4f {
            return vec4f(1, 0, 0, 1);
        }
    `,
});

// where the magic happens, combine shaders, data/layout and target
const cellPipeline = device.createRenderPipeline({
    label: 'Cell pipeline',
    layout: 'auto',
    vertex: {
        module: cellShaderModule,
        entryPoint: 'vertexMain',
        buffers: [vertexBufferLayout],
    },
    fragment: {
        module: cellShaderModule,
        entryPoint: 'fragmentMain',
        targets: [
            {
                format: canvasFormat,
            },
        ],
    },
});

// send the commands to the GPU

const encoder = device.createCommandEncoder();

const pass = encoder.beginRenderPass({
    colorAttachments: [
        {
            view: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            storeOp: 'store',
        },
    ],
});

pass.setPipeline(cellPipeline);
pass.setVertexBuffer(0, vertexBuffer);
pass.draw(vertices.length / 2); // 6 vertices

pass.end();

const commandBuffer = encoder.finish();

device.queue.submit([commandBuffer]);

// device.queue.submit([encoder.finish()]);
