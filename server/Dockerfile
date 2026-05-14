FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json tsconfig*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]
