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

服务器配置为 512 MiB，Linux 可使用约 457 MiB，另有约 1 GiB Swap。原 `moehair-backend` 服务引用不存在的占位 jar 文件并持续失败，配置备份在 `/root/zhiyu-backup-20260905`，旧服务已停用。

2026-09-06 按用户要求完成低内存试跑：Java 21 后端启用 `prod,lite`，使用新建的本地 MariaDB 10.11.18 数据库 `zhiguang` 与现有 Redis 的 **DB 1**。数据库没有迁入历史内容。后端、数据库仅监听本地地址；Nginx 提供公网入口。原有监控、代理和前端保持运行。

仓库变量 **`DEPLOY_COMPONENTS=all`** 已启用：总仓库 main push 会更新前端和后端，后端继续使用服务器保存的轻量配置。`all` 表示发布两个组件，并不启用全部业务依赖。完整功能仍建议至少 4 GB、优先 8 GB 内存，或使用外部服务。

实机验证了 Flyway V1/V2，以及 18 项串行 HTTP 检查：健康、公开列表、验证码生成、注册、密码登录、JWT、个人/关注/推荐列表、通知、刷新令牌旋转和退出。临时测试账户已清理。低频观察中首页接口中位耗时约 24 ms，可用内存约 86–110 MiB，Swap 用量约 100–120 MiB；无 OOM 或服务重启。这是空库、低频试跑结果，不能外推到多人并发或大量内容。

轻量版不提供 AI/RAG、Elasticsearch 搜索、Kafka/Canal 异步同步。当前代码的验证码发送器仅写服务器日志，不发真实邮件/短信；实机认证检查使用临时测试邮箱验证内部链路。OSS 凭据尚未配置，图片、头像和正文上传尚不可用。

### 低内存配置

`low-memory/` 保存这次实测的无秘密配置模板：`backend.conf` 和 `mariadb.conf` 安装到各自 systemd 服务的 `20-low-memory.conf`，`mariadb.cnf` 安装到 `/etc/mysql/mariadb.conf.d/99-zhiyu-low-memory.cnf`。文件注释包含完整目标路径。安装后执行 `systemctl daemon-reload`，数据库参数需重启 MariaDB 才生效；应用参数在下次后端重启生效。已部署服务器上这些配置均已应用，后端与数据库已设置开机启动。

Java 堆上限为 144 MiB，进程还会使用元空间、线程栈和原生内存；systemd 将后端内存限制为 320 MiB、Swap 限制为 128 MiB，防止无限占用。MariaDB 缓冲池为 32 MiB、最多 12 个连接。扩大部署规模前需要重新评估这些上限。

后端配置保存在 `/etc/zhiyu/backend.env`：`SPRING_PROFILES_ACTIVE=prod,lite`、`SERVER_ADDRESS=127.0.0.1`、数据库、Redis 等，以及 `JWT_PRIVATE_KEY=file:/etc/zhiyu/keys/private.pem`、`JWT_PUBLIC_KEY=file:/etc/zhiyu/keys/public.pem`。`JAVA_OPTS` 由上述 systemd 配置提供，当前日志写 journald。数据库应用账号只获得 `zhiguang` 库权限。配置文件和密钥为 `root:zhiyu 0640`。完整模式所需变量见后端的安全生产配置。

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
# SSH 到服务器后查看后端
systemctl status zhiyu-backend
journalctl -u zhiyu-backend -n 100 --no-pager
cat /srv/zhiyu/DEPLOYED_REVISION
```

回退前端时，将 `current` 原子切回上一成功发布目录，随后验证页面和 API。回退后端时使用其上一成功产物，并先确认数据库迁移兼容性；恢复应用版本不会自动撤销数据库变更。
