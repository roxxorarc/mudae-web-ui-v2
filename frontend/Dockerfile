# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
RUN npm install && npm cache clean --force

COPY . .

ARG SUPA_URL
ARG SUPA_ANON
ARG API_URL

RUN VITE_SUPABASE_URL=$SUPA_URL \
    VITE_SUPABASE_ANON_KEY=$SUPA_ANON \
    VITE_API_URL=$API_URL \
    npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

RUN npm install -g serve && npm cache clean --force

COPY --from=builder /app/dist ./dist

USER node

EXPOSE 5175

CMD ["serve", "-s", "dist", "-l", "5175"]
