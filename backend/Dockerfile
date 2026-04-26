FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY tsconfig.json knexfile.ts jest.config.mjs ./
COPY src ./src
COPY migrations ./migrations

CMD ["npx", "tsx", "watch", "src/index.ts"]
