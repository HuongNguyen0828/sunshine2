FROM node:20-alpine

WORKDIR /app

COPY . .

WORKDIR /app/backend

RUN npm install
RUN npm run build:docker

EXPOSE 5001

CMD ["npm", "start"]