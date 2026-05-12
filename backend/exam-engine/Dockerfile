# syntax=docker/dockerfile:1.7

FROM golang:1.22-alpine AS build
WORKDIR /src

# Cache module downloads first.
COPY go.mod go.sum* ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/exam-engine ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/exam-engine /exam-engine
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/exam-engine"]
