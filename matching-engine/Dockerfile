FROM ubuntu:22.04

# Install build tools
RUN apt-get update && apt-get install -y g++ make curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy all files from build context
COPY . .

# Download headers inside the build environment if not present locally
RUN if [ ! -f httplib.h ]; then curl -L -o httplib.h https://raw.githubusercontent.com/yhirose/cpp-httplib/master/httplib.h; fi && \
    if [ ! -f json.hpp ]; then curl -L -o json.hpp https://github.com/nlohmann/json/releases/download/v3.11.3/json.hpp; fi

# Compile matching engine with thread support
RUN g++ -O2 -std=c++17 -pthread main.cpp -o engine

EXPOSE 8080

CMD ["./engine"]

