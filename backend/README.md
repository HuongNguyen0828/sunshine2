# Backend Setup:

npm install firebase-admin // server-side only.
npm install --save-dev @types/node // helps TypeScript recognize import serviceAccount from './serviceAccountKey.json'.

### or

yarn add firebase-admin
yarn add --save-dev @types/node

# for live reload backend

yarn add --dev ts-node-dev

# install dotenv with typescript

yarn add dotenv
yarn add --dev @types/dotenv

## To run server
yarn dev
## or, 
npx ts-node src/server.ts
