# 使用官方 Node.js 运行时作为基础镜像
FROM node:20-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 设置工作目录
WORKDIR /app

# 依赖安装阶段
FROM base AS deps
# 复制包管理文件
COPY package.json pnpm-lock.yaml ./
# 安装依赖（包括 devDependencies，构建时需要）
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
# 从 deps 阶段复制 node_modules
COPY --from=deps /app/node_modules ./node_modules
# 复制项目文件
COPY . .
# 构建 Next.js 应用（不设置 NODE_ENV=production，确保 devDependencies 可用）
RUN pnpm build

# 生产运行阶段
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
# 不运行作为 root 用户
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 复制必要的文件
COPY --from=builder /app/public ./public
# 复制构建输出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# 暴露端口
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 启动应用
CMD ["node", "server.js"]

