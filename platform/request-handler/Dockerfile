# Build stage
FROM golang:1.23-alpine AS build
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -o server main.go

# Final stage
FROM alpine:3.18

RUN apk add --no-cache ca-certificates docker-cli

COPY --from=build /app/server /usr/local/bin/

EXPOSE 1000

ENTRYPOINT ["/usr/local/bin/server"]