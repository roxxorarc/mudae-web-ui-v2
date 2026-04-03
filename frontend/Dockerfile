FROM node:20-slim

WORKDIR /app

# Installation de pnpm
RUN npm install -g pnpm

# Copie des dépendances
COPY package.json pnpm-lock.yaml* ./

# Installation
RUN pnpm install

# Copie du reste (qui sera de toute façon surchargé par le volume en dev)
COPY . .

EXPOSE 3000

# Exécuter l'installation à chaque démarrage pour synchroniser les modules natifs (ex: rolldown) avec l'OS Linux, puis lancer Vite
CMD sh -c "pnpm install && pnpm run dev --host"
