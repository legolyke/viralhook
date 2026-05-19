FROM node:22-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core fonts-liberation python3-pip && \
    pip3 install yt-dlp yt-dlp-youtube-oauth2 --break-system-packages && \
    rm -rf /var/lib/apt/lists/*

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
