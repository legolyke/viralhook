FROM node:22-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core fonts-liberation curl python3 python3-pip && \
    rm -rf /var/lib/apt/lists/*

# Latest yt-dlp binary from GitHub releases
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app
COPY package*.json tsconfig*.json ./
RUN npm install
COPY . .

RUN mkdir -p /usr/share/fonts/truetype/google && \
    cp fonts/*.ttf /usr/share/fonts/truetype/google/ && \
    fc-cache -f

RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]
