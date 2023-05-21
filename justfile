
build-ts:
    npx spack


build-rs:
    cargo build --target=wasm32-unknown-unknown --release
    wasm-bindgen ./target/wasm32-unknown-unknown/release/wgpu_intro.wasm --out-dir ./bin --target web

dev-rs:
    trunk serve

#   https://github.com/kettle11/devserver
serve:
    devserver --reload --address localhost:3000
watch:
    watchexec -e ts,mts -- just build
dev:
    just watch & just serve && kill $!


