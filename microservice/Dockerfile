FROM node:20-slim

# Install git (needed by tessl to clone repos) and tessl CLI
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
RUN npm install -g tessl

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY src/ src/

EXPOSE 3001
ENV PORT=3001

CMD ["node", "src/index.js"]
