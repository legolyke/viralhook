FROM node:20-slim

RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core fonts-liberation wget && \
    mkdir -p /usr/share/fonts/truetype/google && \
    DEJAVU=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf && \
    wget -q "https://github.com/google/fonts/raw/main/ofl/oswald/Oswald-Bold.ttf" \
        -O /usr/share/fonts/truetype/google/Oswald-Bold.ttf || cp "$DEJAVU" /usr/share/fonts/truetype/google/Oswald-Bold.ttf && \
    wget -q "https://github.com/google/fonts/raw/main/ofl/anton/Anton-Regular.ttf" \
        -O /usr/share/fonts/truetype/google/Anton-Regular.ttf || cp "$DEJAVU" /usr/share/fonts/truetype/google/Anton-Regular.ttf && \
    wget -q "https://github.com/google/fonts/raw/main/ofl/bangers/Bangers-Regular.ttf" \
        -O /usr/share/fonts/truetype/google/Bangers-Regular.ttf || cp "$DEJAVU" /usr/share/fonts/truetype/google/Bangers-Regular.ttf && \
    wget -q "https://github.com/google/fonts/raw/main/ofl/pacifico/Pacifico-Regular.ttf" \
        -O /usr/share/fonts/truetype/google/Pacifico-Regular.ttf || cp "$DEJAVU" /usr/share/fonts/truetype/google/Pacifico-Regular.ttf && \
    wget -q "https://github.com/google/fonts/raw/main/ofl/bebasneuenew/BebasNeue-Regular.ttf" \
        -O /usr/share/fonts/truetype/google/BebasNeue-Regular.ttf || cp "$DEJAVU" /usr/share/fonts/truetype/google/BebasNeue-Regular.ttf && \
    wget -q "https://github.com/google/fonts/raw/main/ofl/montserrat/static/Montserrat-Bold.ttf" \
        -O /usr/share/fonts/truetype/google/Montserrat-Bold.ttf || cp "$DEJAVU" /usr/share/fonts/truetype/google/Montserrat-Bold.ttf && \
    wget -q "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf" \
        -O /usr/share/fonts/truetype/google/Poppins-Bold.ttf || cp "$DEJAVU" /usr/share/fonts/truetype/google/Poppins-Bold.ttf && \
    wget -q "https://github.com/google/fonts/raw/main/ofl/dancingscript/static/DancingScript-Bold.ttf" \
        -O /usr/share/fonts/truetype/google/DancingScript-Bold.ttf || cp "$DEJAVU" /usr/share/fonts/truetype/google/DancingScript-Bold.ttf && \
    fc-cache -f && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json tsconfig*.json ./
RUN npm install
COPY . .
RUN npm run build

EXPOSE 8080
CMD ["npm", "start"]
