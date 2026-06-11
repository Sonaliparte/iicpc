FROM golang:1.23-alpine

# Install docker-cli to allow connecting to host's dockerd
RUN apk add --no-cache docker-cli

WORKDIR /app

# Copy files
COPY go.mod ./
COPY main.go ./

# Resolve dependencies and compile
RUN go mod tidy
RUN go build -o sandbox main.go

EXPOSE 9090

# Enforce running in docker flag so health checking resolves container bridge IPs correctly
ENV RUNNING_IN_DOCKER=true

CMD ["./sandbox"]
