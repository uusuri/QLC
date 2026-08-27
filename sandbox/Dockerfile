FROM ubuntu:24.04 AS sandbox-build

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  g++ \
  cmake \
  ninja-build \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /src/sandbox

COPY sandbox/CMakeLists.txt ./
COPY sandbox/include ./include
COPY sandbox/src ./src

RUN cmake \
  -S . \
  -B build \
  -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  && cmake --build build

FROM ubuntu:24.04 AS runtime

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
  g++ \
  && rm -rf /var/lib/apt/lists/*

COPY --from=sandbox-build \
  /src/sandbox/build/sandbox \
  /usr/local/bin/qlc-sandbox

WORKDIR /job
