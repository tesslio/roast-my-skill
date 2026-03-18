FROM node:20-slim

# Install tessl CLI
RUN npm install -g tessl

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production
COPY src/ src/

EXPOSE 3001
ENV PORT=3001

CMD ["node", "src/index.js"]
