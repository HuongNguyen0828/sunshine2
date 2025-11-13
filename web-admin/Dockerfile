FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY web-admin/package*.json ./
RUN npm install

# Copy web-admin source code
COPY web-admin/ ./

# Shared will be mounted via volumes, but copy it for build time  
COPY shared/ ../shared/

# Build the Next.js app for production: 
RUN npm run build --no-lint

EXPOSE 3000

CMD ["npm", "start"]