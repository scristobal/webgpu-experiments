(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))n(t);new MutationObserver(t=>{for(const r of t)if(r.type==="childList")for(const a of r.addedNodes)a.tagName==="LINK"&&a.rel==="modulepreload"&&n(a)}).observe(document,{childList:!0,subtree:!0});function g(t){const r={};return t.integrity&&(r.integrity=t.integrity),t.referrerPolicy&&(r.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?r.credentials="include":t.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(t){if(t.ep)return;t.ep=!0;const r=g(t);fetch(t.href,r)}})();if(!navigator.gpu)throw new Error("WebGPU not supported on this browser.");const U=await navigator.gpu.requestAdapter();if(!U)throw new Error("No appropriate GPUAdapter found.");const e=await U.requestDevice(),G=navigator.gpu.getPreferredCanvasFormat(),f=document.querySelector("canvas");if(!f)throw new Error("No canvas found.");const _=f.getContext("webgpu");if(!_)throw new Error("No WebGPU context found.");_.configure({device:e,format:G});const d=f.width/8,v=f.height/8,B=new Float32Array([d,v]),p=e.createBuffer({label:"Grid Uniforms",size:B.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(p,0,B);const C=new Float32Array([.5]),b=e.createBuffer({label:"Scale uniform",size:C.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(b,0,C);const u=new Uint32Array(d*v),s=[e.createBuffer({label:"Cell State A",size:u.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),e.createBuffer({label:"Cell State B",size:u.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST})];for(let i=0;i<u.length;i++)u[i]=Math.random()>.5?1:0;e.queue.writeBuffer(s[0],0,u);const h=new Float32Array([-1,-1,0,0,0,1,1,-1,0,0,0,1,1,1,0,0,0,1,-1,-1,0,0,0,1,1,1,0,0,0,1,-1,1,0,0,0,1]),O=e.createBuffer({label:"Cell vertices",size:h.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(O,0,h);const T={arrayStride:(2+4)*4,attributes:[{format:"float32x2",offset:0,shaderLocation:0},{shaderLocation:1,offset:2*4,format:"float32x4"}]},P=e.createShaderModule({label:"Cell shader",code:`
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
`}),m=16,x=Math.ceil(d/m),z=e.createShaderModule({label:"Game of Life simulation shader",code:`
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
        @workgroup_size(${m}, ${m})
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
    `}),y=e.createBindGroupLayout({label:"Cell Bind Group Layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.COMPUTE,buffer:{}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{}},{binding:2,visibility:GPUShaderStage.VERTEX|GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}]}),S=[e.createBindGroup({label:"Cell renderer bind group A",layout:y,entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:b}},{binding:2,resource:{buffer:s[0]}},{binding:3,resource:{buffer:s[1]}}]}),e.createBindGroup({label:"Cell renderer bind group B",layout:y,entries:[{binding:0,resource:{buffer:p}},{binding:1,resource:{buffer:b}},{binding:2,resource:{buffer:s[1]}},{binding:3,resource:{buffer:s[0]}}]})],E=e.createPipelineLayout({label:"Cell Pipeline Layout",bindGroupLayouts:[y]}),R=e.createRenderPipeline({label:"Cell pipeline",layout:E,vertex:{module:P,entryPoint:"vertex_main",buffers:[T]},fragment:{module:P,entryPoint:"fragment_main",targets:[{format:G}]}}),V=e.createComputePipeline({label:"Simulation pipeline",layout:E,compute:{module:z,entryPoint:"compute_main"}}),l=new Float32Array(100);let w=performance.now();const L=()=>{c++;const i=e.createCommandEncoder(),o=i.beginComputePass();o.setPipeline(V),o.setBindGroup(0,S[c%2==0?1:0]),o.dispatchWorkgroups(x,x),o.end();const g=_.getCurrentTexture().createView(),n=i.beginRenderPass({colorAttachments:[{view:g,loadOp:"clear",clearValue:{r:1,g:1,b:1,a:1},storeOp:"store"}]});n.setPipeline(R),n.setVertexBuffer(0,O),n.setBindGroup(0,S[c%2==1?1:0]),n.draw(h.length/(2+4),d*v),n.end();const t=i.finish();if(e.queue.submit([t]),l[c%l.length]=performance.now()-w,w=performance.now(),c%l.length===0){const r=l.reduce((a,A)=>a+A)/l.length;console.log("average fps",1e3/r)}requestAnimationFrame(L)};let c=0;requestAnimationFrame(L);
