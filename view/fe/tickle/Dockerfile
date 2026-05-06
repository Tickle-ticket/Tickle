FROM node:20-alpine

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --no-frozen-lockfile --shamefully-hoist

COPY . .

RUN NEXT_PUBLIC_API_MOCKING=disabled pnpm build

EXPOSE 3000

CMD ["pnpm", "start"]
