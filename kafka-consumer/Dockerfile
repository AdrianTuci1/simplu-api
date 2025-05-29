FROM hexpm/elixir:1.15.7-erlang-26.2.1-debian-bullseye-20231009 as build

# Install build dependencies
RUN apt-get update -y && apt-get install -y build-essential git \
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

RUN apt-get update -y && apt-get install -y libstdc++6 openssl libncurses5 locales netcat \
    && apt-get clean && rm -f /var/lib/apt/lists/*_*

# Set the locale
RUN sed -i '/en_US.UTF-8/s/^# //g' /etc/locale.gen && locale-gen

ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

WORKDIR /app

# Copy the release from the build stage
COPY --from=build /app/_build/prod/rel/kafka_consumer ./

# Set Kafka environment variables
ENV KAFKA_GROUP_ID="kafka-consumer-group"
ENV KAFKA_CLIENT_ID="kafka-consumer"
ENV KAFKA_BROKERS="kafka:9092"

# Create wait script
RUN echo '#!/bin/sh\n\
echo "Waiting for Kafka to be ready..."\n\
while ! nc -z kafka 9092; do\n\
  echo "Waiting for Kafka port..."\n\
  sleep 2\n\
done\n\
echo "Kafka port is available, waiting for Kafka to be fully ready..."\n\
sleep 30\n\
echo "Starting Kafka consumer..."\n\
exec bin/kafka_consumer start' > /app/start.sh && \
chmod +x /app/start.sh

CMD ["/app/start.sh"] 