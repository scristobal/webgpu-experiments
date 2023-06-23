(function(){const o=document.createElement("link").relList;if(o&&o.supports&&o.supports("modulepreload"))return;for(const t of document.querySelectorAll('link[rel="modulepreload"]'))n(t);new MutationObserver(t=>{for(const r of t)if(r.type==="childList")for(const f of r.addedNodes)f.tagName==="LINK"&&f.rel==="modulepreload"&&n(f)}).observe(document,{childList:!0,subtree:!0});function u(t){const r={};return t.integrity&&(r.integrity=t.integrity),t.referrerPolicy&&(r.referrerPolicy=t.referrerPolicy),t.crossOrigin==="use-credentials"?r.credentials="include":t.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(t){if(t.ep)return;t.ep=!0;const r=u(t);fetch(t.href,r)}})();if(!navigator.gpu)throw new Error("WebGPU not supported on this browser.");const x=await navigator.gpu.requestAdapter();if(!x)throw new Error("No appropriate GPUAdapter found.");const e=await x.requestDevice(),w=navigator.gpu.getPreferredCanvasFormat(),l=document.querySelector("canvas");if(!l)throw new Error("No canvas found.");const C=window.innerWidth/window.innerHeight;l.width=l.height*C;const m=l.getContext("webgpu");if(!m)throw new Error("No WebGPU context found.");m.configure({device:e,format:w});const s=l.width,_=l.height,G=new Float32Array([s,_]),g=e.createBuffer({label:"Grid Uniforms",size:G.byteLength,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(g,0,G);const c=new Uint32Array(s*_),a=[e.createBuffer({label:"Cell State A",size:c.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),e.createBuffer({label:"Cell State B",size:c.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST})];for(let i=0;i<c.length;i+=3)c[i]=Math.random()>.5?1:0;e.queue.writeBuffer(a[0],0,c);const y=new Float32Array([-.8,-.8,0,0,0,1,.8,-.8,0,0,0,1,.8,.8,0,0,0,1,-.8,-.8,0,0,0,1,.8,.8,0,0,0,1,-.8,.8,0,0,0,1]),S=e.createBuffer({label:"Cell vertices",size:y.byteLength,usage:GPUBufferUsage.VERTEX|GPUBufferUsage.COPY_DST});e.queue.writeBuffer(S,0,y);const O={arrayStride:(2+4)*4,attributes:[{format:"float32x2",offset:0,shaderLocation:0},{shaderLocation:1,offset:2*4,format:"float32x4"}]},v=e.createShaderModule({label:"Cell shader",code:`
        @group(0) @binding(0) var<uniform> grid_size: vec2<f32>;
        @group(0) @binding(1) var<storage> cell_state: array<u32>;

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

            let cell_offset = cell / grid_size * 2;
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
`}),p=8,h=Math.ceil(s/p),E=e.createShaderModule({label:"Game of Life simulation shader",code:`
        @group(0) @binding(0) var<uniform> grid_size: vec2<f32>;

        @group(0) @binding(1) var<storage> cell_state_in: array<u32>;
        @group(0) @binding(2) var<storage, read_write> cell_state_out: array<u32>;



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
        @workgroup_size(${p}, ${p})
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
    `}),b=e.createBindGroupLayout({label:"Cell Bind Group Layout",entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.COMPUTE,buffer:{}},{binding:1,visibility:GPUShaderStage.VERTEX|GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}]}),P=[e.createBindGroup({label:"Cell renderer bind group A",layout:b,entries:[{binding:0,resource:{buffer:g}},{binding:1,resource:{buffer:a[0]}},{binding:2,resource:{buffer:a[1]}}]}),e.createBindGroup({label:"Cell renderer bind group B",layout:b,entries:[{binding:0,resource:{buffer:g}},{binding:1,resource:{buffer:a[1]}},{binding:2,resource:{buffer:a[0]}}]})],U=e.createPipelineLayout({label:"Cell Pipeline Layout",bindGroupLayouts:[b]}),L=e.createRenderPipeline({label:"Cell pipeline",layout:U,vertex:{module:v,entryPoint:"vertex_main",buffers:[O]},fragment:{module:v,entryPoint:"fragment_main",targets:[{format:w}]}}),A=e.createComputePipeline({label:"Simulation pipeline",layout:U,compute:{module:E,entryPoint:"compute_main"}}),B=()=>{d++;const i=e.createCommandEncoder(),o=i.beginComputePass();o.setPipeline(A),o.setBindGroup(0,P[d%2==0?1:0]),o.dispatchWorkgroups(h,h),o.end();const u=m.getCurrentTexture().createView(),n=i.beginRenderPass({colorAttachments:[{view:u,loadOp:"clear",clearValue:{r:1,g:1,b:1,a:1},storeOp:"store"}]});n.setPipeline(L),n.setVertexBuffer(0,S),n.setBindGroup(0,P[d%2==1?1:0]),n.draw(y.length/(2+4),s*_),n.end();const t=i.finish();e.queue.submit([t]),requestAnimationFrame(B)};let d=0;requestAnimationFrame(B);
