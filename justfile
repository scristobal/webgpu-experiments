
build:
    npx spack


#   https://github.com/kettle11/devserver
serve:
    devserver --reload --address localhost:3000
watch:
    watchexec -e ts,mts,html,css,js -- just build
dev:
    just watch & just serve && kill $!


