#!/usr/bin/env bash
# 自动构建并部署 zhiyu_fe 到 Cloudflare Pages
# 用法：
#   ./scripts/deploy.sh                 # 交互式登录 wrangler，部署到 zhiyu-36a
#   ./scripts/deploy.sh --project=NAME  # 指定 Pages 项目名（默认 zhiyu-36a）
#   CLOUDFLARE_API_TOKEN=xxx ./scripts/deploy.sh  # 用 API token 跳过登录
#   ./scripts/deploy.sh --skip-build    # 跳过构建（使用上次的 dist/）
#   ./scripts/deploy.sh --dry-run       # 只构建不部署
#
# 首次使用：
#   1. npm i -g wrangler  或  npx wrangler --version
#   2. wrangler login      登录 Cloudflare 账号
#   3. ./scripts/deploy.sh 开始部署
#
# Pages 项目（Cloudflare Dashboard）需要先在网页上手动创建一次：
#   - Project name: zhiyu-36a
#   - Build command: npm run build
#   - Build output: dist
#   - 之后命令行会复用项目

set -euo pipefail

# ====== 路径 ======
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DIST_DIR="$PROJECT_ROOT/dist"

# ====== 参数解析 ======
PROJECT_NAME="zhiyu-36a"
SKIP_BUILD=false
DRY_RUN=false
COMMIT_MESSAGE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project=*)
      PROJECT_NAME="${1#*=}"
      shift
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --message=*)
      COMMIT_MESSAGE="${1#*=}"
      shift
      ;;
    -h|--help)
      sed -n '2,21p' "$0"
      exit 0
      ;;
    *)
      echo "未知参数: $1" >&2
      exit 1
      ;;
  esac
done

# ====== 工具检测 ======
if ! command -v node >/dev/null 2>&1; then
  echo "❌ 未检测到 node，请先安装 Node.js (>= 18)" >&2
  exit 1
fi
echo "✅ node: $(node --version)"

if ! command -v npm >/dev/null 2>&1; then
  echo "❌ 未检测到 npm" >&2
  exit 1
fi
echo "✅ npm:  $(npm --version)"

# wrangler：优先全局，其次 npx
WRL=""
if command -v wrangler >/dev/null 2>&1; then
  WRL="wrangler"
elif [ -x "$PROJECT_ROOT/node_modules/.bin/wrangler" ]; then
  WRL="$PROJECT_ROOT/node_modules/.bin/wrangler"
else
  echo "ℹ️  未检测到 wrangler，将用 npx 拉取（首次较慢）"
  WRL="npx -y wrangler"
fi
echo "✅ wrangler: $WRL"

# ====== token 注入 ======
# 用户可通过 CLOUDFLARE_API_TOKEN 环境变量跳过交互登录
if [ -n "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "🔑 使用 CLOUDFLARE_API_TOKEN 环境变量"
  export CLOUDFLARE_API_TOKEN
fi

# ====== 校验 .env.production ======
ENV_PROD="$PROJECT_ROOT/.env.production"
if [ ! -f "$ENV_PROD" ]; then
  echo "⚠️  $ENV_PROD 不存在，prod 构建可能拿不到 VITE_API_BASE_URL" >&2
else
  echo "✅ 使用 $ENV_PROD"
  grep -E "VITE_API_BASE_URL" "$ENV_PROD" || true
fi

# ====== 1. 构建 ======
if [ "$SKIP_BUILD" = true ]; then
  echo "⏭️  跳过构建，使用现有 $DIST_DIR"
else
  echo ""
  echo "📦 [1/2] 构建生产包..."
  cd "$PROJECT_ROOT"
  npm run build
  echo "✅ 构建完成，输出：$DIST_DIR"
fi

if [ ! -d "$DIST_DIR" ]; then
  echo "❌ $DIST_DIR 不存在，构建可能失败" >&2
  exit 1
fi

DIST_SIZE=$(du -sh "$DIST_DIR" | awk '{print $1}')
echo "📊 dist 大小：$DIST_SIZE"

# ====== 2. 部署 ======
if [ "$DRY_RUN" = true ]; then
  echo ""
  echo "🧪 [2/2] DRY-RUN 模式：跳过部署"
  echo "将执行：$WRL pages deploy $DIST_DIR --project-name=$PROJECT_NAME --commit-dirty=true --branch=main"
  exit 0
fi

echo ""
echo "🚀 [2/2] 部署到 Cloudflare Pages: $PROJECT_NAME"

# 默认 commit 信息
if [ -z "$COMMIT_MESSAGE" ]; then
  COMMIT_MESSAGE="deploy: $(date '+%Y-%m-%d %H:%M:%S')"
fi

# wrangler 部署
# --commit-dirty: 允许 dirty working tree 部署（避免 git 检查失败）
# --branch=main: 主分支名
# --project-name: Pages 项目名
$WRL pages deploy "$DIST_DIR" \
  --project-name="$PROJECT_NAME" \
  --commit-dirty=true \
  --branch=main \
  --commit-message="$COMMIT_MESSAGE"

echo ""
echo "✅ 部署完成！"
echo "🌐 访问：https://${PROJECT_NAME}.pages.dev"
