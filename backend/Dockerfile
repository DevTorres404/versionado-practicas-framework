# Multi-stage Dockerfile for Go Fiber backend (Fase 3)
FROM golang:1.26-alpine AS builder

WORKDIR /app

# Download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy source code and build binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server .

# Production runner image
FROM alpine:3.20

WORKDIR /app

COPY --from=builder /server /app/server
COPY --from=builder /app/.env* ./

EXPOSE 3000

CMD ["/app/server"]
