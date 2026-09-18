#!/usr/bin/env bash
# Подготовка директорий мониторинга (Prometheus / Grafana / Loki).
#
# Docker создаёт bind-mount директории на хосте от root, а процессы в контейнерах
# работают под непривилегированными пользователями:
#   Prometheus — 65534 (nobody)
#   Grafana    — 472
#   Loki       — 10001
# Поэтому выставляем владельцев через одноразовый root-контейнер (sudo не нужен).

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$ROOT_DIR/dev_data"

mkdir -p "$DATA_DIR/prometheus" "$DATA_DIR/grafana" "$DATA_DIR/loki"

docker run --rm --user root -v "$DATA_DIR:/data" --entrypoint sh grafana/grafana:latest -c '
    chown 1000:1000 /data && \
    chown -R 65534:65534 /data/prometheus && \
    chown -R 472:472 /data/grafana && \
    chown -R 10001:10001 /data/loki'

echo "✓ Monitoring data dirs ready: $DATA_DIR"
