# spaceapp

colocar o token do git no export para deploy 
export GH_TOKEN=token do git 

git tag v1.0.0 && git push --tags
npx electron-builder --publish always

