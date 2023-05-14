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
    format: canvasFormat
});

// prepare data

// start with the grid size, since it is constant for each iteration it should be a uniform
const GRID_SIZE = 4;

// Create a uniform buffer that describes the grid.
const uniformArray = new Float32Array([GRID_SIZE, GRID_SIZE]);

const uniformBuffer = device.createBuffer({
    label: 'Grid Uniforms',
    size: uniformArray.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
});

device.queue.writeBuffer(uniformBuffer, 0, uniformArray);

// x, y pairs grouped in points: p1, p2, p3, q1, q2, q3
// triplets of points grouped in triangles
const vertices = new Float32Array([
    -0.8, -0.8, 1, 0, 0, 1, 0.8, -0.8, 0, 1, 0, 1, 0.8, 0.8, 0, 0, 1, 1, -0.8, -0.8, 1, 0, 0, 1, 0.8, 0.8, 0, 0, 1, 1,
    -0.8, 0.8, 1, 1, 0, 1
]); // exercise: use Index Buffers to avoid repetition

// copy data into the GPU
const vertexBuffer = device.createBuffer({
    label: 'Cell vertices',
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
});
// actually moves the data
device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/ 0, vertices);

// tells the GPU how is the data organized
const vertexBufferLayout = {
    arrayStride: (2 + 4) * 4,
    attributes: [
        {
            format: 'float32x2' as const,
            offset: 0,
            shaderLocation: 0 // Position, see vertex shader
        },
        {
            shaderLocation: 1, // color
            offset: 2 * 4,
            format: 'float32x4' as const
        }
    ]
};

// write the shaders
const cellShaderModule = device.createShaderModule({
    label: 'Cell shader',
    code: /* wgsl */ `
        @group(0) @binding(0) var<uniform> grid_size: vec2<f32>;

        struct VertexOut {
            @builtin(position) position : vec4<f32>,
            @location(0) color : vec4<f32>
        }

        @vertex
        fn vertex_main(@location(0) position: vec2<f32>, @location(1) color: vec4<f32>) -> VertexOut
        {
            var output : VertexOut;
            output.position = vec4<f32>(position / grid_size, 0, 1);
            output.color = color;
            return output;
        }

        @fragment
        fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
        {
            return fragData.color;
        }
`
});

// where the magic happens, combine shaders, data/layout and target
const cellPipeline = device.createRenderPipeline({
    label: 'Cell pipeline',
    layout: 'auto',
    vertex: {
        module: cellShaderModule,
        entryPoint: 'vertex_main',
        buffers: [vertexBufferLayout]
    },
    fragment: {
        module: cellShaderModule,
        entryPoint: 'fragment_main',
        targets: [
            {
                format: canvasFormat
            }
        ]
    }
});

// this creates a bind group for our uniform
const bindGroup = device.createBindGroup({
    label: 'Cell renderer bind group',
    layout: cellPipeline.getBindGroupLayout(0),
    entries: [
        {
            binding: 0,
            resource: { buffer: uniformBuffer }
        }
    ]
});

// send the commands to the GPU

const encoder = device.createCommandEncoder();

const pass = encoder.beginRenderPass({
    colorAttachments: [
        {
            view: context.getCurrentTexture().createView(),
            loadOp: 'clear',
            storeOp: 'store'
        }
    ]
});

pass.setPipeline(cellPipeline);
pass.setVertexBuffer(0, vertexBuffer);
pass.setBindGroup(0, bindGroup);

pass.draw(vertices.length / (2 + 4)); // 6 vertices

pass.end();

const commandBuffer = encoder.finish();

device.queue.submit([commandBuffer]);

// device.queue.submit([encoder.finish()]);

// follow up https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
