# 知域服务器部署

本目录管理总仓库 `https://github.com/comioko/zhiyu` 的服务器部署。前端和后端分别位于 `zhiyu_fe/`、`zhiyu_be/`。这两个目录本地各有独立 Git 仓库；它们的独立仓库 push 不会触发总仓库的工作流。整站自动部署以 **push 到总仓库的 `main` 分支** 为入口。

## 访问与反向代理

- 服务器：`113.20.8.115`，SSH 端口：`22`。
- 前端静态目录：`/srv/zhiyu/frontend/current`。
- Nginx 将同源 `/api/` 请求转发到 `127.0.0.1:8080`，保留原始请求路径。
- `GET /healthz` 转发到后端 `/actuator/health`。后端应只返回汇总健康状态，关闭公开健康详情；直接访问 `/actuator` 返回 404。
- 前端采用 React 浏览器路由，Nginx 已配置刷新页面时回退至 `index.html`。
- 问答使用 SSE，代理缓冲和压缩已关闭，读取超时为 300 秒。

`nginx.conf` 是独立站点模板，仅匹配上述服务器 IP，未声明 `default_server`。安装前检查 `nginx -T` 中现有站点的监听端口、`server_name` 和配置加载目录；保留现有配置，不覆盖默认站点。确认没有相同 IP 的 `server_name` 冲突后，将本模板安装为独立配置文件，例如 `/etc/nginx/conf.d/zhiyu.conf`。执行 `nginx -t` 成功后再执行 `systemctl reload nginx`。

前端构建使用 Node.js 22，在 `zhiyu_fe/` 执行 `npm ci` 和 `npm run build`，输出为 `dist/`。构建时将 `VITE_API_BASE_URL` 设置为空字符串，保持 API 与页面同源。旧配置中的 `VITE_API_URL` 不被 API 客户端读取。浏览器构建变量会进入公开静态文件，不得放入服务端密钥。

## 自动发布原则

1. 在总仓库推送完整前后端变更至 `main`。
2. GitHub Actions 安装依赖、运行项目检查并构建产物，构建失败时停止发布。
3. 将产物上传至新的发布目录 `/srv/zhiyu/releases/<提交SHA>-<运行ID>-<重试次数>/`，其中包含 `frontend/` 和 `backend/`。
4. 检查产物和后端健康状态，再原子切换 `current` 链接，保留上一成功版本及其版本标识。
5. 检查首页、直接访问的前端路由、`/healthz`、API 和 SSE；发布失败时恢复上一成功版本。

发布脚本保留最近 5 个版本，并跳过仍在使用的前端、后端版本。后端启动前执行数据库备份，备份在 `/var/backups/zhiyu` 保存 14 天。应用失败回退不会撤销 Flyway 数据库迁移；迁移必须兼容上一版本。

## 本次服务器状态与部署开关

2026-09-05 检查时服务器可用物理内存总量约 457 MiB，已有 Java 21、Nginx 和 Redis，没有 MySQL、Kafka、Elasticsearch。原 `moehair-backend` 服务引用不存在的占位 jar 文件并持续失败，配置备份在 `/root/zhiyu-backup-20260905`，旧服务已停用。

完整部署建议至少 4 GB、优先 8 GB 内存，或使用外部数据库、Kafka 和 Elasticsearch。升级或外部服务方案尚未确定，因此仓库变量 **`DEPLOY_COMPONENTS=frontend`**：每次总仓库 main push 都构建和检查前后端，但仅自动发布前端。前端页面可打开，依赖后端的登录、数据等功能在后端启动前不可用。

后端运行条件准备好后，在服务器安装 MySQL 8、配置 `/etc/zhiyu/backend.env`、RSA 密钥和数据库备份账号，再将仓库变量改为 `all`，手动运行 `Build and deploy Zhiyu` 即可发布完整版本。`prod,lite` 是可选精简配置，需要明确接受无 AI/RAG、Elasticsearch 搜索和 Kafka 异步同步能力；不能视作完整功能部署。

后端配置至少包含 `SPRING_PROFILES_ACTIVE`、`JAVA_OPTS`、`SERVER_ADDRESS=127.0.0.1`、数据库、Redis、OSS、邮件、AI/ES/Kafka（完整模式）配置，以及 `JWT_PRIVATE_KEY=file:/etc/zhiyu/keys/private.pem`、`JWT_PUBLIC_KEY=file:/etc/zhiyu/keys/public.pem`、`BACKEND_LOG_FILE=/var/log/zhiyu/app.log`。具体变量见后端的安全生产配置。配置文件用 `root:zhiyu 0640`，密钥文件用 `root:zhiyu 0640`。

数据库备份配置 `/etc/zhiyu/database.cnf` 为标准 MySQL `[client]` 配置，包含备份用户连接信息，只允许 root 读取（0600）。备份目标数据库为 `zhiguang`。`bootstrap.sh` 仅创建发布目录、运行用户、最小 sudo 权限、Nginx 和 systemd 配置，不安装数据库、不启动后端。完成后端配置后再启用 `systemctl enable zhiyu-backend`。

## 密钥与服务器配置

GitHub Actions 使用 `zhiyu-deploy` 用户与独立部署 SSH 密钥连接服务器，应用以 `zhiyu` 用户运行。仓库 Secrets 为 `SERVER_HOST`、`SERVER_PORT`、`SERVER_USER`、`SERVER_SSH_KEY`、`SERVER_KNOWN_HOSTS`。私钥只保存在 Actions Secret，只把对应公钥安装到服务器，主机公钥已固定。部署用户只能通过 sudo 重启/停止此后端和执行固定数据库备份脚本。服务器密码、SSH 私钥、数据库密码、服务端 API 密钥和真实环境配置不得提交 Git，也不要写入工作流日志。

服务器上的运行配置应独立于每次发布的代码和产物保存，并限制读取权限。发布时复用服务器配置，不从前端构建环境传递服务端密钥。

## 日常检查与恢复

查看总仓库 Actions 运行记录确认构建和部署结果。服务器上的 `readlink -f /srv/zhiyu/frontend/current` 可确定当前前端版本。通过 `nginx -t` 检查代理配置，通过 Nginx 日志检查 HTTP 请求错误，通过后端实际运行方式对应的服务日志检查应用启动和数据库连接。

```bash
# 在本地总仓库根目录推送（不要在子目录中向子仓库 push）
git push origin main
# 手动重新构建和部署
gh workflow run deploy.yml -R comioko/zhiyu
# SSH 到服务器后查看后端（仅启用完整发布后）
systemctl status zhiyu-backend
journalctl -u zhiyu-backend -n 100 --no-pager
cat /srv/zhiyu/DEPLOYED_REVISION
```

回退前端时，将 `current` 原子切回上一成功发布目录，随后验证页面和 API。回退后端时使用其上一成功产物，并先确认数据库迁移兼容性；恢复应用版本不会自动撤销数据库变更。
