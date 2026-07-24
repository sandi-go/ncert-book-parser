FROM golang:1.22-bookworm AS builder
WORKDIR /src
COPY go.mod ./
COPY . .
RUN CGO_ENABLED=0 go build -o /ncert-parser ./cmd/server

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    mupdf-tools \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /ncert-parser /app/ncert-parser
EXPOSE 8080
ENV PORT=8080
ENTRYPOINT ["/app/ncert-parser"]
