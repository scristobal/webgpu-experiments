import { renderer } from '@src/backends/webgl2';

const version = import.meta.env.VITE_APP_VERSION;
console.log(`[${new Date()}] Using version ${version}`);

const canvasElement = document.querySelector('canvas') ?? document.createElement('canvas');

if (!document.contains(canvasElement)) document.body.append(canvasElement);

const initTime = performance.now();

renderer(canvasElement)
    .then(requestAnimationFrame)
    .catch(console.error)
    .finally(() => console.log(`[${new Date()}] Ready in ${(performance.now() - initTime).toFixed(3)}ms`));
