const adapter = (await navigator.gpu.requestAdapter())!;

const device = (await adapter.requestDevice())!;

const format = navigator.gpu.getPreferredCanvasFormat();

const canvas = document.querySelector('canvas')!;

const context = canvas.getContext('webgpu')!;

context.configure({ format, device });

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

renderPass.end();

const commandBuffer = encoder.finish();

device.queue.submit([commandBuffer]);

console.log('done');

export {};
