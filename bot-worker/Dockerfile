FROM golang:1.21-alpine

WORKDIR /app

# Copy dependency files and source code
COPY go.mod ./
COPY main.go ./

# Compile bot executable
RUN go build -o bot main.go

# Default configurations (can be overridden at runtime)
ENV TARGET_URL=http://host.docker.internal:8081
ENV BOT_COUNT=10
ENV DURATION_SEC=30
ENV RATE_TPS=100
ENV PERSONA=mixed

CMD ["./bot"]
