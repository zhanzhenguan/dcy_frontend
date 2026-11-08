#!/usr/bin/env bash
set -euo pipefail

# 前端静态资源部署脚本（放置于远端服务器执行）
# 用法: bash /tmp/deploy-html.sh

APP_DIR="/apps/dcy/html"
ARCHIVE="/tmp/dist.tar.gz"

if [[ ! -f "$ARCHIVE" ]]; then
  echo "Error: archive not found: $ARCHIVE" >&2
  exit 1
fi

mkdir -p "$APP_DIR"

# 1. 删除原 /apps/dcy/html 内的静态页面文件（含隐藏文件，保留目录本身）
find "$APP_DIR" -mindepth 1 -maxdepth 1 -exec rm -rf {} +

# 2. 解压 dist.tar.gz 中所有静态文件到 /apps/dcy/html（tar 包内容不含 dist/ 前缀）
tar -xzf "$ARCHIVE" -C "$APP_DIR"

# 清理临时压缩包
rm -f "$ARCHIVE"

echo "Deploy completed at $(date '+%Y-%m-%d %H:%M:%S')"
