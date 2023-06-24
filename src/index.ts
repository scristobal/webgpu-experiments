/**
 * Sample GPU app from Google's I/O 2023
 * https://codelabs.developers.google.com/your-first-webgpu-app
 *
 * Samuel Cristobal, May 2023
 */

/**
 *
 * Initialization and checks
 *
 *
 */

// get adapter
if (!navigator.gpu) {
    throw new Error('WebGPU not supported on this browser.');
}

const adapter = await navigator.gpu.requestAdapter();

if (!adapter) {
    throw new Error('No appropriate GPUAdapter found.');
}

// use adapter to get device
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

// Data preparation, grid size on both axis
const GRID_SIZE_X = canvas.width / 8;
const GRID_SIZE_Y = canvas.height / 8;

// this represents the size of the board, since
// it is constant for each iteration it should be a uniform
const gridSizeArray = new Float32Array([GRID_SIZE_X, GRID_SIZE_Y]);

const gridSizeBuffer = device.createBuffer({
    label: 'Grid Uniforms',
    size: gridSizeArray.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
});
device.queue.writeBuffer(gridSizeBuffer, 0, gridSizeArray);

const scaleArray = new Float32Array([0.5]);

const scaleBuffer = device.createBuffer({
    label: 'Scale uniform',
    size: scaleArray.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
});
device.queue.writeBuffer(scaleBuffer, 0, scaleArray);

// This represent the cell state using two buffers
// in each iteration one buffer will be used for
// drawing and the other for computing the next state
const cellStateArray = new Uint32Array(GRID_SIZE_X * GRID_SIZE_Y);

const cellStateStorage: [GPUBuffer, GPUBuffer] = [
    device.createBuffer({
        label: 'Cell State A',
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    }),
    device.createBuffer({
        label: 'Cell State B',
        size: cellStateArray.byteLength,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    })
];

// initialization
for (let i = 0; i < cellStateArray.length; i++) {
    cellStateArray[i] = Math.random() > 0.5 ? 1 : 0;
}
device.queue.writeBuffer(cellStateStorage[0], 0, cellStateArray);

// for (let i = 0; i < cellStateArray.length; i += 3) {
//     cellStateArray[i] = Math.random() > 0.5 ? 1 : 0;
// }
// device.queue.writeBuffer(cellStateStorage[1], 0, cellStateArray);

// finally a vertex array to represent a square as 2 triangles
// x, y pairs grouped in points: p1, p2, p3, q1, q2, q3
// triplets of points grouped in triangles
const vertices = new Float32Array([
    -1, -1, 0, 0, 0, 1, 1, -1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, -1, -1, 0, 0, 0, 1, 1, 1, 0, 0, 0, 1, -1, 1, 0, 0, 0, 1
]); // exercise: use Index Buffers to avoid repetition

// copy data into the GPU
const vertexBuffer = device.createBuffer({
    label: 'Cell vertices',
    size: vertices.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
});
device.queue.writeBuffer(vertexBuffer, /*bufferOffset=*/ 0, vertices);

// tells the GPU how is the data organized
const vertexBufferLayout = {
    arrayStride: /* 2 floats per point */ (2 + /* 4 floats per color */ 4) * /* 4 bytes per float */ 4,
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

/**
 *
 * Cell drawing shaders
 *
 */

// this shaders are used to render the board
const cellShaderModule = device.createShaderModule({
    label: 'Cell shader',
    code: /* wgsl */ `
        @group(0) @binding(0) var<uniform> grid_size: vec2<f32>;
        @group(0) @binding(1) var<uniform> scale: f32;
        @group(0) @binding(2) var<storage> cell_state: array<u32>;

        struct VertexIn {
            @location(0) position: vec2<f32>,
            @location(1) color: vec4<f32>,
            @builtin(instance_index) instance: u32
        }

        struct VertexOut {
            @builtin(position) position : vec4<f32>,
            @location(0) color : vec4<f32>
        }

        @vertex
        fn vertex_main(input: VertexIn) -> VertexOut
        {
            var output : VertexOut;


            let state = f32(cell_state[input.instance]);

            let i = f32(input.instance);
            let cell = vec2<f32>( i % grid_size.x, floor(i / grid_size.y));

            let cell_offset = cell / (scale * grid_size) * 2 ;
            let grid_position = (input.position*state + 1) / grid_size - 1 + cell_offset;

            output.position = vec4<f32>(grid_position, 0, 1);
            output.color = input.color;
            return output;
        }

        @fragment
        fn fragment_main(fragData: VertexOut) -> @location(0) vec4<f32>
        {
            return fragData.color;
        }
`
});

// in this case arbitrary, in general same workgroup can share memory and synchronize
// rule of thumb is size of 64, in this case 8*8
const WORKGROUP_SIZE = 16;

// used later in the render loop
const workgroupCount = Math.ceil(GRID_SIZE_X / WORKGROUP_SIZE);

// this shader is used to evolve the board state
const simulationShaderModule = device.createShaderModule({
    label: 'Game of Life simulation shader',
    code: /* wgsl */ `
        @group(0) @binding(0) var<uniform> grid_size: vec2<f32>;

        @group(0) @binding(2) var<storage> cell_state_in: array<u32>;
        @group(0) @binding(3) var<storage, read_write> cell_state_out: array<u32>;



        fn cell_index(cell: vec2u) -> u32 {
            return (cell.y % u32(grid_size.y)) * u32(grid_size.x) + (cell.x % u32(grid_size.x));
        }

        fn cell_active(x: u32, y: u32) -> u32 {
            return cell_state_in[cell_index(vec2(x, y))];
        }

        fn active_neighbors(cell: vec3u) -> u32 {
            return cell_active(cell.x+1, cell.y+1) +
                cell_active(cell.x+1, cell.y) +
                cell_active(cell.x+1, cell.y-1) +
                cell_active(cell.x, cell.y-1) +
                cell_active(cell.x-1, cell.y-1) +
                cell_active(cell.x-1, cell.y) +
                cell_active(cell.x-1, cell.y+1) +
                cell_active(cell.x, cell.y+1);
        }

        @compute
        @workgroup_size(${WORKGROUP_SIZE}, ${WORKGROUP_SIZE})
        fn compute_main(@builtin(global_invocation_id) cell: vec3u) {

            let num_active = active_neighbors(cell);

            let i = cell_index(cell.xy);

            // Conway's game of life rules:
            switch num_active {
                case 2: { // Active cells with 2 neighbors stay the same.
                    cell_state_out[i] = cell_state_in[i];
                }
                case 3: { // Cells with 3 neighbors become or stay active.
                    cell_state_out[i] = 1;
                }
                default: { // Cells with < 2 or > 3 neighbors become inactive.
                    cell_state_out[i] = 0;
                }
            }
        }
    `
});

/**
 *
 * Glueing all together in a pipeline
 *
 * where the magic happens, combine shaders, data/layout and target
 */

// this creates a bind group for our uniforms
const bindGroupLayout = device.createBindGroupLayout({
    label: 'Cell Bind Group Layout',
    entries: [
        {
            binding: 0,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
            buffer: {} // Grid uniform buffer
        },
        {
            binding: 1,
            visibility: GPUShaderStage.VERTEX,
            buffer: {}
        },
        {
            binding: 2,
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE,
            buffer: { type: 'read-only-storage' } // Cell state input buffer
        },
        {
            binding: 3,
            visibility: GPUShaderStage.COMPUTE,
            buffer: { type: 'storage' } // Cell state output buffer
        }
    ]
});

const bindGroups: [GPUBindGroup, GPUBindGroup] = [
    device.createBindGroup({
        label: 'Cell renderer bind group A',
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: { buffer: gridSizeBuffer }
            },
            {
                binding: 1,
                resource: { buffer: scaleBuffer }
            },
            {
                binding: 2,
                resource: { buffer: cellStateStorage[0] }
            },
            {
                binding: 3,
                resource: { buffer: cellStateStorage[1] }
            }
        ]
    }),
    device.createBindGroup({
        label: 'Cell renderer bind group B',
        layout: bindGroupLayout,
        entries: [
            {
                binding: 0,
                resource: { buffer: gridSizeBuffer }
            },
            {
                binding: 1,
                resource: { buffer: scaleBuffer }
            },
            {
                binding: 2,
                resource: { buffer: cellStateStorage[1] }
            },
            {
                binding: 3,
                resource: { buffer: cellStateStorage[0] }
            }
        ]
    })
];

const pipelineLayout = device.createPipelineLayout({
    label: 'Cell Pipeline Layout',
    bindGroupLayouts: [bindGroupLayout]
});

const cellPipeline = device.createRenderPipeline({
    label: 'Cell pipeline',
    layout: pipelineLayout,
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

const simulationPipeline = device.createComputePipeline({
    label: 'Simulation pipeline',
    layout: pipelineLayout,
    compute: {
        module: simulationShaderModule,
        entryPoint: 'compute_main'
    }
});

/**
 *
 * Render loop
 *
 *  */

const renderTimes = new Float32Array(100);
let lastRenderTime = performance.now();

const updateGrid = () => {
    step++;
    /**
     * Start encoder
     * */
    const encoder = device.createCommandEncoder();

    /**
     * Start simulation pass
     */
    const computePass = encoder.beginComputePass();

    computePass.setPipeline(simulationPipeline);

    computePass.setBindGroup(0, bindGroups[step % 2 == 0 ? 1 : 0]);

    computePass.dispatchWorkgroups(workgroupCount, workgroupCount);

    computePass.end();

    /**
     * Start  render pass
     */

    const view = context.getCurrentTexture().createView();

    const renderPass = encoder.beginRenderPass({
        colorAttachments: [
            {
                view,
                loadOp: 'clear', // defaults to black
                clearValue: { r: 1, g: 1, b: 1, a: 1 },
                storeOp: 'store'
            }
        ]
    });

    renderPass.setPipeline(cellPipeline);

    renderPass.setVertexBuffer(0, vertexBuffer);
    renderPass.setBindGroup(0, bindGroups[step % 2 == 1 ? 1 : 0]); // TS can't check 0 <= step % 2 <= 1

    renderPass.draw(vertices.length / (2 + 4), GRID_SIZE_X * GRID_SIZE_Y);

    renderPass.end();

    const commandBuffer = encoder.finish();

    device.queue.submit([commandBuffer]);

    renderTimes[step % renderTimes.length] = performance.now() - lastRenderTime;
    lastRenderTime = performance.now();

    if (step % renderTimes.length === 0) {
        const averageRenderTime = renderTimes.reduce((a, b) => a + b) / renderTimes.length;
        console.log('average fps', 1000 / averageRenderTime);
    }

    /**
     * Schedule next frame
     */
    requestAnimationFrame(updateGrid);
};

let step = 0;
requestAnimationFrame(updateGrid);

// follow up https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
