FROM hexpm/elixir:1.15.7-erlang-26.2.1-debian-bullseye-20231009 as build

# Install build dependencies
RUN apt-get update -y && apt-get install -y build-essential git curl \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

# Prepare build dir
WORKDIR /app

# Set build environment
ENV MIX_ENV=prod

# Install hex + rebar
RUN mix local.hex --force && \
    mix local.rebar --force

# Install mix dependencies
COPY mix.exs ./
RUN mix deps.get
RUN mix deps.compile

# Copy config and source
COPY config config
COPY lib lib

# Compile the project
RUN mix do compile, release

# Start a new build stage
FROM debian:bullseye-slim

RUN apt-get update -y && apt-get install -y libstdc++6 openssl libncurses5 locales curl netcat \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

# Set the locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

WORKDIR /app

# Copy the release from the build stage
COPY --from=build /app/_build/prod/rel/notification_hub ./

# Set gRPC environment variables
ENV GRPC_PORT="50051"
ENV AI_AGENT_GRPC_URL="ai-agent-server:50052"

# Expose Phoenix and gRPC ports
EXPOSE 4000 50051

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:4000/health || exit 1

# Create start script
RUN echo '#!/bin/sh\n\
echo "Starting Notification Hub service..."\n\
echo "Phoenix port: 4000"\n\
echo "gRPC port: $GRPC_PORT"\n\
echo "AI Agent gRPC URL: $AI_AGENT_GRPC_URL"\n\
exec bin/notification_hub start' > /app/start.sh && \
chmod +x /app/start.sh

CMD ["/app/start.sh"] 