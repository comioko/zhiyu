# 知域社区 (Zhiyu)

> 让知识发光 —— 一个面向终身学习者的知识分享与社区互动平台。

知域是一个**学习 + 创作 + 社交**三合一的知识社区。在这里，用户可以发布「知文」（图文 / 图文 + 视频混合的内容载体）、追踪感兴趣的人、点赞收藏优质内容，也可以借助 RAG 问答直接向知文提问。整套设计走 **Kawaii / Cozy** 治愈系卡通风格：奶茶底色、可可描边、平面硬阴影，像翻一本温暖的绘本书。

![知域首页](docs/screenshots/home.png)

---

## ✨ 功能一览

### 🔐 账号与认证
- 手机号 / 邮箱 + 验证码登录注册
- JWT (RS256) 无状态鉴权 + Refresh Token 自动续期
- 修改资料、头像上传、技能标签

### 📚 知文（核心内容载体）
- Markdown 富文本编辑器 + 多图直传（阿里云 OSS / Cloudflare R2）
- 封面轮播 + 灯箱预览
- 点赞 / 收藏 / 置顶 / 公开 / 私密
- 草稿 → 预签 → 上传 → 发布 五步流程

### 🔍 发现与搜索
- 首页 Feed 分页瀑布流 + IntersectionObserver 懒加载
- 关键词搜索 + 高亮命中片段 + 联想补全（300ms 防抖）

### 💬 RAG 智能问答
- 知文详情页内联提问，SSE 流式输出
- Spring AI + Elasticsearch 向量检索 + OpenAI 兼容模型

### 👥 社交关系
- 关注 / 取关 + 互关标记
- 关注 / 粉丝列表弹窗分页
- 5 项计数（关注、粉丝、发帖、获赞、获藏）

### 🎨 UI 设计
- 9 个原子组件 + 10 个通用组件
- 设计 token 单一源（`tokens.ts`）同步输出到 CSS 变量 + Tailwind preset
- 响应式：桌面侧边栏 / 移动底部 Tab Bar

---

## 🏗️ 技术栈

### 前端（`zhiyu_fe/`）
| 类别 | 选型 |
|---|---|
| 框架 | React 18 + TypeScript |
| 构建 | Vite 5 |
| 路由 | React Router 6 |
| 样式 | Tailwind CSS 3 + CSS Modules（设计系统） |
| 图标 | lucide-react + 自绘 SVG（5 mascot + 4 装饰） |
| HTTP | Fetch + 自封装 `apiFetch`（Bearer Token 自动注入） |
| 状态 | React Context（AuthContext） |
| 富文本 | react-markdown + remark-gfm |
| 部署 | Cloudflare Pages |

### 后端（`zhiyu_be/`）
| 类别 | 选型 |
|---|---|
| 框架 | Spring Boot 3.2.4 + Java 21 |
| 安全 | Spring Security + JWT (RS256, RSA 2048) + Spring Authorization Server |
| ORM | MyBatis + MySQL 8 |
| 缓存 | Redis (Lettuce) |
| 消息 | Kafka（异步事件 / Outbox 模式） |
| 检索 | Elasticsearch 8 + Spring AI 向量存储 |
| AI | Spring AI + OpenAI 兼容模型（Coze / 通义千问） |
| 对象存储 | 阿里云 OSS + Cloudflare R2（双备份） |
| API 文档 | Springdoc OpenAPI |

### DevOps
- 后端：Maven 3.9 + Spring Boot Maven Plugin
- 前端：npm 9 + Vite 5 + Wrangler 4（Pages 部署）
- 隧道：Cloudflare Tunnel（`cloudflared`）把本地后端暴露公网
- 监控：Spring Boot Actuator（`/actuator/health`、`/actuator/info`）

---

## 📂 仓库结构

本项目采用**多仓库拆分**结构，每个子项目独立版本控制：

| 仓库 | 内容 | 地址 |
|---|---|---|
| `comioko/zhiyu` | **本仓库** — 总入口、文档、整体介绍 | https://github.com/comioko/zhiyu |
| `comioko/zhiyu_be` | 后端 Spring Boot 项目 | https://github.com/comioko/zhiyu_be |
| `comioko/zhiyu_fe` | 前端 React + Vite 项目 | https://github.com/comioko/zhiyu_fe |

每个子仓库都是独立的 git 仓库，可以单独 clone、部署。

---

## 🚀 快速开始

### 环境要求
- **后端**：JDK 21、Maven 3.9、MySQL 8、Redis 7、Kafka 3、Elasticsearch 8
- **前端**：Node.js 18+、npm 9+
- **可选**：Docker（推荐，用于本地起中间件）

### 1. 启动中间件
```bash
# MySQL（导入 schema）
docker run -d --name mysql -p 3306:3306 \
  -e MYSQL_ROOT_PASSWORD=1234567890 -e MYSQL_DATABASE=zhiguang mysql:8
docker exec -i mysql mysql -uroot -p1234567890 zhiguang < zhiyu_be/db/schema.sql

# Redis
docker run -d --name redis -p 6379:6379 redis:7

# Kafka
docker run -d --name kafka -p 9092:9092 \
  -e KAFKA_PROCESS_ROLES=broker,controller -e KAFKA_NODE_ID=1 \
  -e KAFKA_LISTENERS=PLAINTEXT://:9092 -e KAFKA_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  apache/kafka:3

# Elasticsearch
docker run -d --name elasticsearch -p 9200:9200 \
  -e discovery.type=single-node -e xpack.security.enabled=false \
  -e ES_JAVA_OPTS="-Xms512m -Xmx512m" docker.elastic.co/elasticsearch/elasticsearch:8.18.1
```

### 2. 启动后端
```bash
git clone https://github.com/comioko/zhiyu_be.git
cd zhiyu_be
# 配置 application.yml（数据库 / Redis / OSS 密钥等，本地不提交）
# 参考 src/main/resources/application.yml.example
mvn spring-boot:run
# → http://localhost:8080
```

### 3. 启动前端
```bash
git clone https://github.com/comioko/zhiyu_fe.git
cd zhiyu_fe
npm install
npm run dev
# → http://localhost:5173
```

### 4. 一键体验（推荐）
本地无中间件？想直接看效果？我们提供 docker-compose 一键起所有依赖：
```bash
# 见 zhiyu_be 仓库的 docker-compose.yml
```

---

## 🌐 公网部署

### 前端 → Cloudflare Pages
```bash
cd zhiyu_fe
npm run deploy    # 等同 ./scripts/deploy.sh，自动构建 + wrangler pages deploy
```

### 后端 → Cloudflare Tunnel（开发 / 演示）
```bash
cloudflared tunnel --url http://localhost:8080
# 拿到一个 https://xxx.trycloudflare.com 公网 URL
# 复制 URL → 写入 zhiyu_fe/.env.production 的 VITE_API_BASE_URL → 重新部署前端
```

### 生产环境（推荐）
- 前端：Cloudflare Pages（自动 HTTPS、CDN 全球加速）
- 后端：阿里云 / 腾讯云 ECS + 域名 + Nginx 反向代理
- 数据库：阿里云 RDS for MySQL
- 缓存：阿里云 Redis
- 搜索：阿里云 Elasticsearch / 自建
- AI：OpenAI / 通义千问 / DeepSeek 任选

---

## 🎨 设计系统

### 配色（Kawaii / Cozy）
| Token | 颜色 | 用途 |
|---|---|---|
| `--color-milk` | `#F5EFE6` | 页面背景 |
| `--color-cream` | `#FBF6EE` | 面板 / 卡片 |
| `--color-cocoa` | `#5D4037` | 描边 / 重点文字 |
| `--color-sky` | `#B8D8E8` | 选中高亮 |
| `--color-matcha` | `#A8C99B` | 成功 / 装饰 |
| `--color-warning` | `#D88C8C` | 警示 |
| `--color-peach` | `#FFD9B8` | 点缀 |

### 规范
- **圆角**：输入框 20px / 按钮 24px / 面板 32px
- **描边**：所有组件 `3px solid #5D4037`（不是靠阴影定义边界）
- **阴影**：`4px 4px 0 #5D4037`（平面卡通硬阴影，无 blur）
- **字体**：Quicksand（英文圆体）+ MiSans（中文）

### 交互
- hover：阴影加深 + 左上偏移 `translate(-2px, -2px)`
- active：阴影减小 + 右下偏移（按下"贴纸"反馈）
- focus：天蓝色 `0 0 0 4px #B8D8E8` 外环

详见 `zhiyu_fe/src/theme/tokens.ts`。

---

## 🤝 贡献

欢迎贡献代码、反馈 bug、提功能建议！

1. Fork 对应子仓库（`zhiyu_fe` 或 `zhiyu_be`）
2. 创建 feature 分支：`git checkout -b feature/your-feature`
3. 提交变更：`git commit -m "feat: add xxx"`
4. 推送到分支：`git push origin feature/your-feature`
5. 创建 Pull Request

### 行为准则
- 尊重所有贡献者
- 提交前跑通 `npm run lint` / `mvn verify`
- 保持设计语言统一（Kawaii 风格）

---

## 📄 许可证

本项目仅供学习与个人作品展示，未经授权禁止商业使用。

---

## 🙏 致谢

- 设计灵感：[Kawaii UI](https://kawaii.com)、[Bento UI](https://bentogrids.com)
- 图标：[lucide](https://lucide.dev)、[Storyset](https://storyset.com)
- 字体：[MiSans](https://hyperos.mi.com/font)、[Quicksand](https://fonts.google.com/specimen/Quicksand)

---

<p align="center">
  <sub>Built with ☕ by 知域团队</sub>
</p>
