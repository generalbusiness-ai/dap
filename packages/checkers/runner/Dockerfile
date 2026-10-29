ARG BASE_IMAGE
FROM ${BASE_IMAGE} AS build
WORKDIR /build
COPY *.go /build/
RUN GO111MODULE=off CGO_ENABLED=0 GOTOOLCHAIN=local go build -trimpath -ldflags='-s -w -buildid=' -o /build/artroom-git-relay .

FROM ${BASE_IMAGE}
COPY --from=build --chmod=0555 /build/artroom-git-relay /usr/local/bin/artroom-git-relay
USER 65533:65533
ENTRYPOINT ["/usr/local/bin/artroom-git-relay"]
