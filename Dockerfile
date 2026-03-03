FROM node:25-alpine3.22

RUN apk add --no-cache cargo alsa-lib

RUN mkdir -p /app/src
WORKDIR /app
COPY Cargo.toml .
COPY Cargo.lock .
RUN touch src/earshot.rs
RUN cargo fetch --locked

COPY src src
RUN cargo build --release

COPY package.json .
COPY package-lock.json .
RUN npm install

ENTRYPOINT ["npm", "start", "--"]
CMD [""]
