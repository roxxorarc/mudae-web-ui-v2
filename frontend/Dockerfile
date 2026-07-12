# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install && npm cache clean --force

COPY . .

ARG API_URL=""

RUN VITE_API_URL=$API_URL \
    npm run build

# Production stage
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 5175
