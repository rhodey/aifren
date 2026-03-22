FROM node:25-alpine3.22

RUN apk add --no-cache cargo alsa-lib

RUN mkdir -p /app/src
WORKDIR /app
COPY Cargo.toml .
COPY Cargo.lock .
COPY src/earshot.rs src/earshot.rs
RUN cargo build --release

COPY package.json .
COPY package-lock.json .
RUN npm install
COPY src src

ENTRYPOINT ["npm", "start", "--"]
CMD [""]
