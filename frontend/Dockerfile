# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install && npm cache clean --force

COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 5175

CMD ["serve", "-s", "dist", "-l", "5175"]
