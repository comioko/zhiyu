# 知域社区项目面试题库（50 题）

> **岗位**：后端开发（70%）+ Agent 开发（30%）
> **项目周期**：2025.12 - 2026.3（约 4 个月独立开发）
> **技术栈**：Spring Boot 3.2 + Java 21 + Spring AI 1.0 + RAG + MySQL 8 + MyBatis + Redis 7 + Kafka 3 + Elasticsearch 8
> **项目地址**：https://github.com/comioko/zhiyu

## 项目核心硬数据（贯穿面试，**必背**）

| 指标 | 数值 | 实现关键 |
|---|---|---|
| AI 问答 Top-5 召回率 | **92%** | V1 baseline 78% → V2 切块 85% → V3 重排 89% → V4 混合检索 92% |
| AI 首问 RT | **4.8s → 1.5s** | Embedding 缓存 + 向量预热 + 流式响应 + Top-K 优化 + 关键词短路 |
| 计数服务内存 | **节省 30%** | Redis SDS 自定义编码（varint + type tag）|
| Feed 三级缓存 | L1 Caffeine / L2 Redis / L3 MySQL | hotkey 探测 + 缓存预热 + 随机抖动防雪崩 |
| 搜索深分页 | ES `search_after` | 替代 from+size，解决 shard 数 × from 放大 |

---

## 题库结构（11 大类，50 题）

| # | 分类 | 题数 | 难度 |
|---|---|---|---|
| 1 | 项目介绍 | 3 | ★ |
| 2 | 后端基础（Spring Boot） | 6 | ★★ |
| 3 | 数据库（MySQL） | 7 | ★★★ |
| 4 | 缓存（Redis） | 4 | ★★★ |
| 5 | 消息队列（Kafka） | 4 | ★★★ |
| 6 | 分布式与一致性 | 5 | ★★★★ |
| 7 | 性能调优与监控 | 5 | ★★★★ |
| 8 | 搜索 & Elasticsearch | 3 | ★★★ |
| 9 | RAG / Agent（重点） | 6 | ★★★★ |
| 10 | 架构设计 | 4 | ★★★★ |
| 11 | 行为面试 & 软技能 | 3 | ★ |

---

## 第 1 类：项目介绍（3 题）

### Q1：请用 3 分钟介绍下这个项目？

**回答**：

> 这个项目叫**知域社区**（github.com/comioko/zhiyu），是一个**面向终身学习者的知识分享社区**，类似小红书 + 知乎的结合体。我作为**独立开发者**，从 2025 年 12 月到 2026 年 3 月完成了从架构设计到上线的全流程。
>
> 五大模块：
> 1. **认证系统**：短信验证码 + JWT 双令牌模式（access 15min + refresh 7d）
> 2. **内容系统**：知文（图文+视频混排）、Feed 流、点赞收藏、关注关系
> 3. **AI 问答系统**：基于 RAG 的知文智能问答（Spring AI + ES 向量库 + DeepSeek）
> 4. **搜索系统**：基于 ES 的全文检索 + 联想词
> 5. **计数系统**：千万级用户的内容计数器（Redis SDS 自定义编码）
>
> 我个人最满意的设计是 **AI 问答系统的 RAG 召回优化**——从最初版的首问 4.8 秒、Top-5 召回率 78% 优化到 1.5 秒、92%。

### Q2：团队多大？代码量多少？你怎么独立搞定全栈？

**回答**：

> **独立开发**（个人项目）。后端 50+ 模块，约 1.5 万行 Java 代码；前端 React + TypeScript，约 1 万行 TS/TSX。MySQL 25 张表、Redis 7 种数据结构、3 个 Kafka topic、ES 1 个向量索引（1024 维）。
>
> 独立搞定全栈的关键：
> - **技术选型收敛**：选熟悉的 Spring 全家桶 + 主流中间件（不追新）
> - **先骨架后细节**：先跑通端到端主流程，再优化细节
> - **强可观测性**：每加一个服务先加日志 / 健康检查
> - **AI 辅助**：复杂 SQL 优化、bug 定位借助 LLM，但**架构设计自己做决策**

### Q3：项目目前有真实用户吗？未来商业化怎么打算？

**回答**：

> 目前是**自用 demo**，部署在自己 ECS 上跑通（157.226.172.184），核心数据是 mock 的（~50 篇知文 + 20 个测试用户）。
>
> 商业化如果做：
> - **P0**：打磨 AI 问答用户体验（Top-5 召回率 → 96%+）
> - **P1**：创作者激励（打赏 / 付费内容 / 知识付费）
> - **P2**：B 端（教育机构 / 企业培训场景）

---

## 第 2 类：后端基础（Spring Boot 6 题）

### Q4：JWT 的双令牌模式是怎么设计的？为什么要 refresh token？

**回答**：

> 单 token 有两个问题：
> 1. **access token 泄露风险高**——前端存 localStorage，XSS 攻击可以拿到
> 2. **短 access token 频繁过期**——用户体验差
>
> 我的设计：
> - **access token**：15 分钟过期，**无状态**（自包含 userId + role），RS256 签名
> - **refresh token**：7 天过期，**有状态**（Redis 存 `refresh_token:{userId}:{jti}` → userId 映射）
> - **刷新机制**：access 过期 → refresh 调 `/auth/token/refresh` → 后端验证后返回**新 access + 新 refresh**（**rotate**，旧的进黑名单）
> - **登出**：删除 refresh + access jti 加入 Redis 黑名单（到 access 过期时间）
>
> **追问点**：
> - Q: refresh token 怎么防重放？→ 答：用 `jti`（JWT ID）作唯一标识，每次刷新后旧 jti 失效
> - Q: access token 在有效期内泄露怎么办？→ 答：靠黑名单机制 + 短 TTL 缓解
> - Q: 为什么不只用 refresh token 不用 access？→ 答：每次请求查 Redis 性能差；access 无状态更快

### Q5：你们的密码策略是什么？存密码用什么算法？

**回答**：

> 密码策略：
> - 长度 ≥ 8 位
> - 必须包含字母 + 数字
> - 登录失败 5 次锁定 30 分钟（Redis 计数器 `login_fail:{userId}`）
> - 传输层 HTTPS
>
> 存储算法：**BCrypt**（Spring Security 默认），`BCryptPasswordEncoder`，cost = 10
>
> **追问点**：
> - Q: 为什么用 BCrypt 不用 MD5/SHA1？→ 答：MD5/SHA1 太快（GPU 每秒数十亿次），易被彩虹表；BCrypt 慢且加盐（每次 salt 不同），抗暴力破解
> - Q: 不用 Argon2 吗？→ 答：Argon2 安全性更高但 Spring Security 默认 BCrypt，且我们单机 QPS 够用；未来扛大压力可切 Argon2
> - Q: salt 怎么存？→ 答：BCrypt 自动生成 16 字节 salt 存在 hash 输出里（`$2a$10$<22-char-salt><31-char-hash>`）

### Q6：短信验证码防刷、防盗用怎么设计？

**回答**：

> - **生成**：6 位数字，**SecureRandom** 生成，存 Redis `sms_code:{phone}` → 5 分钟 TTL
> - **发送频率限制**：同手机号 1 分钟最多 1 条，1 天最多 10 条（Redis 计数器）
> - **验证**：比较时用 `MessageDigest.isEqual`（**防时序攻击**）
> - **一次性**：验证成功立即 `DEL` Redis key
> - **风控**：异地 IP 短时间内多次请求 → 触发图形验证码
>
> **追问点**：
> - Q: 验证码用 HMAC 还是明文存 Redis？→ 答：明文存 Redis（5 分钟过期 + Redis ACL）；生产用 `sms_code_hash:{phone}` → SHA256(原始码) 更安全
> - Q: 短信服务商怎么选？→ 答：阿里云 + 腾讯云备用；阈值经验值，后续按数据调

### Q7：讲讲 Spring Boot 的 Bean 生命周期？

**回答**（**背这个流程**）：

> 1. **实例化**：调用构造方法（推断）
> 2. **属性填充**：`@Autowired` / `@Resource` 注入依赖
> 3. **初始化**：
>    - `@PostConstruct` 方法
>    - `InitializingBean.afterPropertiesSet()`
>    - 自定义 `init-method`
> 4. **使用**：放入 BeanFactory 单例池
> 5. **销毁**（容器关闭）：
>    - `@PreDestroy` 方法
>    - `DisposableBean.destroy()`
>    - 自定义 `destroy-method`
>
> **实战**：我在 `RagConfig` 里用 `BeanPostProcessor` 拦截 `@ConditionalOnExpression` 时机——因为 Spring AI bean 在 Refresh 阶段后期创建，配置类加载太早导致 `@ConditionalOnBean` 不可靠，**改用 `@ConditionalOnExpression` SpEL 在 Environment 阶段判断**。
>
> **追问点**：
> - Q: BeanPostProcessor vs BeanFactoryPostProcessor？→ 答：BFP 是 Bean 级别（实例化前后回调），BFFP 是 BeanDefinition 级别（修改 bean 定义）
> - Q: 循环依赖？→ 答：三级缓存（singletonObjects / earlySingletonObjects / singletonFactories）；构造器注入无法解决循环依赖
> - Q: @PostConstruct vs afterPropertiesSet 顺序？→ 答：@PostConstruct → afterPropertiesSet → init-method

### Q8：Spring Boot 启动慢怎么排查？

**回答**：

> 1. **`spring-boot-starter-actuator`** + `management.startup-tracking.enabled=true` 暴露 `/actuator/startup`
> 2. **`@Lazy`**：延迟加载非关键 bean
> 3. **关 dev tools**（`spring-boot-devtools`）
> 4. **`-Ddebug` 日志**：看 `ConditionEvaluationReport`
> 5. **`/actuator/beans`**：列出所有 bean 及其依赖
> 6. **`/actuator/conditions`**：所有 `@Conditional` 评估结果（**最有用**）
>
> 我们项目：
> - 关 AI：~30 秒（DB + Redis + Kafka + ES + Flyway）
> - 开 AI：~3 分钟（OpenAI Embedding 加载 + 向量库 schema 初始化）
>
> **追问点**：
> - Q: 主要慢在哪？→ 答：Embedding 模型首次加载（bge-large-zh 约 3 秒 336MB ONNX Runtime）

### Q9：Spring 循环依赖三级缓存怎么工作的？

**回答**：

> ```
> 一级缓存：singletonObjects（完整 bean）
> 二级缓存：earlySingletonObjects（早期引用，未注入属性）
> 三级缓存：singletonFactories（ObjectFactory 工厂函数）
> ```
>
> 流程（A 依赖 B，B 依赖 A）：
> 1. 创建 A，调用构造器（属性未注入），放入**三级缓存**（ObjectFactory）
> 2. 发现 A 依赖 B → 创建 B
> 3. B 依赖 A → 从三级缓存找 A 的 ObjectFactory → 创建早期 A → 放入**二级缓存**
> 4. B 注入 A 成功 → B 创建完 → 放**一级缓存**
> 5. A 继续注入 B → 完成 → 放**一级缓存**（同时清二三级）
>
> **追问点**：
> - Q: 为什么不能三级缓存直接用二级？→ 答：AOP 代理需要原始对象（ObjectFactory 调用 `getEarlyBeanReference` 触发代理），二级缓存存的是已代理对象，循环依赖中可能多次注入导致多次代理
> - Q: 构造器注入为什么不能循环？→ 答：构造调用在实例化阶段，还没放入三级缓存

---

## 第 3 类：MySQL 数据库（7 题）

### Q10：你的 users 表怎么设计？phone 和 email 都加唯一索引的原因？

**回答**：

> ```sql
> CREATE TABLE users (
>     id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
>     phone VARCHAR(32) NULL UNIQUE,
>     email VARCHAR(128) NULL UNIQUE,
>     zg_id VARCHAR(64) NULL UNIQUE,  -- 知域 ID
>     password_hash VARCHAR(128) NULL,
>     nickname VARCHAR(64) NOT NULL,
>     avatar VARCHAR(512) NULL,
>     ...
> ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
> ```
>
> 设计要点：
> 1. **`id` BIGINT UNSIGNED**：未来用户超 21 亿（AUTO_INSIGNED 极限），UNSIGNED 给 2 倍空间
> 2. **phone / email 各自 UNIQUE 但都允许 NULL**：用户可能只填手机不填邮箱，MySQL UNIQUE 允许多个 NULL
> 3. **zg_id 也 UNIQUE**：作为短链用户 ID（@xxx）
> 4. **utf8mb4 + utf8mb4_unicode_ci**：支持 emoji（昵称常有 😀）
>
> **追问点**：
> - Q: 为什么不分库分表？→ 答：当前 50 万用户以下单机 MySQL 够用；预计 1000 万时按 `id % 64` 水平分库
> - Q: 软删除 vs 硬删除？→ 答：用软删除（`deleted_at`），符合 GDPR "被遗忘权"但保留审计
> - Q: 昵称不 UNIQUE？→ 答：昵称可重名（小红书允许），但 zg_id 必须唯一

### Q11：Feed 流分页怎么实现？上拉加载会重复/丢失吗？

**回答**：

> 用 **cursor-based pagination（游标分页）**，**不是** OFFSET。
>
> ```sql
> -- 传统 OFFSET 慢
> SELECT * FROM knowposts WHERE user_id IN (...) ORDER BY id DESC LIMIT 20 OFFSET 1000;
> -- OFFSET 1000 仍要扫前 1000 行
>
> -- 我们用游标
> SELECT * FROM knowposts 
> WHERE id < {last_id_from_previous_page}  -- 上一页最小 id
>   AND user_id IN (...)
> ORDER BY id DESC LIMIT 20;
> ```
>
> 优势：O(log n) 主键索引扫描，新发的帖子不会插队。
>
> **追问点**：
> - Q: 关注关系变化怎么处理？→ 答：cursor 是全局 id，新关注的用户从下一页出现，不会重复
> - Q: 怎么保证不丢？→ 答：`id < cursor` 用小于号（不是 ≤），被删的帖子自动跳过
> - Q: 大 V 关注列表上万用户怎么办？→ 答：游标分页只取 Top-N 关注的最新 20 条，不遍历全关注列表

### Q12：千万级计数器怎么做？Redis SDS 怎么省内存？

**回答**：

> 场景：每篇知文有点赞数、收藏数、阅读数。**MySQL 扛不住高并发写**。

| 方案 | QPS | 内存 | 一致性 |
|---|---|---|---|
| MySQL `UPDATE ... SET count = count + 1` | ~1k | 低 | 强 |
| Redis `INCR` 字符串 | 10w+ | 高（1 key = 40+ bytes）| 弱（异步落库）|
| Redis `HINCRBY` Hash | 10w+ | 中 | 弱 |
| **Redis SDS 自定义编码** | 10w+ | **低** | 弱 |

> **我们的方案**（节省 30%）：
> 1. value < 256 用 **uint8**（1 byte）
> 2. 256 ≤ value < 65536 用 **uint16**（2 bytes）
> 3. value ≥ 65536 用 **uint32**（4 bytes）
> 4. key 加 **4-bit type tag** 区分类型
>
> Lua 脚本原子操作 + bit 拼接。
>
> **追问点**：
> - Q: Redis 持久化怎么办？→ 答：AOF + 每日定时把 Redis 计数同步到 MySQL（凌晨 3 点低峰），最多丢一天
> - Q: Redis cluster 怎么分片？→ 答：`knowpost_id % 16384` 哈希到 4 master + 4 slave；Lua 脚本保证同 key 操作同节点
> - Q: 为什么不用 HyperLogLog？→ 答：HLL 是去重计数（UV），我们是累加（PV/点赞总数）

### Q13：联合索引最左前缀原则知道吗？举例子

**回答**：

> ```sql
> ALTER TABLE knowposts ADD INDEX idx_user_status_time (user_id, status, created_at);
> ```
>
> 索引命中（按最左前缀匹配）：
> - `WHERE user_id = 1` ✓
> - `WHERE user_id = 1 AND status = 'published'` ✓
> - `WHERE user_id = 1 AND status = 'published' AND created_at > '2026-01-01'` ✓
>
> 索引失效：
> - `WHERE status = 'published'` ✗（跳过 user_id）
> - `WHERE user_id = 1 AND created_at > '2026-01-01'` ✗（跳过 status）
> - `WHERE status = 'published' AND created_at > '2026-01-01'` ✗
>
> **追问点**：
> - Q: 范围查询之后的索引会失效？→ 答：对，`>` `<` `BETWEEN` 后面的列索引失效；但 `=` `IN` 不会
> - Q: 索引下推 ICP？→ 答：MySQL 5.6+，在存储引擎层用索引过滤数据，减少回表

### Q14：分页查询很深（OFFSET 100000）怎么优化？

**回答**：

> 传统 `LIMIT 20 OFFSET 100000` 慢（扫 100020 行）。
>
> 1. **子查询优化**：
>    ```sql
>    SELECT * FROM knowposts 
>    WHERE id >= (SELECT id FROM knowposts WHERE user_id = 1 ORDER BY id DESC LIMIT 100000, 1)
>    ORDER BY id DESC LIMIT 20
>    ```
> 2. **业务层禁止深分页**：前端翻 100 页就停了
> 3. **search_after 深分页**（ES 方案）：传上一页最后一条的 `sortValues`
>
> **追问点**：
> - Q: 为什么 ES 推荐 search_after？→ 答：from+size 浅分页（< 10000）还行，深分页 deep paging 需要每个 shard 都算 from+size，coordinator 聚合，shard 数 × from 会爆

### Q15：事务隔离级别用过哪些？项目默认哪个？

**回答**：

> MySQL InnoDB 默认 **Repeatable Read（RR）**。
>
> 我们用 `@Transactional(rollbackFor = Exception.class)` 显式声明回滚。
>
> 场景：
> - 点赞 + 计数：**本地事务**（一次 UPDATE）
> - 转账 + 计数：**分布式事务**（seata 或本地消息表）
> - 关注 + Feed 推送：本地事务 + **Kafka 异步**
>
> **追问点**：
> - Q: RR 有什么问题？→ 答：幻读（InnoDB 用 MVCC + Next-Key Lock 解决大部分）
> - Q: 用 Read Committed 吗？→ 答：没有，RR 够用；RC 在 binlog row 模式（statement 模式 RR 更安全）+ 主从一致性更好
> - Q: 什么是 MVCC？→ 答：每行加 `trx_id` + `roll_pointer`，SELECT 读 undo log 里的历史版本

### Q16：线上数据库慢查询怎么排查？

**回答**：

> 1. **开启慢查询日志**：`slow_query_log=ON`，`long_query_time=0.5`（500ms 算慢）
> 2. **`pt-query-digest`** 分析慢日志，统计 top 10
> 3. **EXPLAIN** 看执行计划（type=ALL 全表扫、key=NULL 没用到索引、Extra=Using filesort 需要排序）
> 4. **MySQL Performance Schema** 查 `events_statements_summary_by_digest` 表
>
> 我项目里遇到的案例：
> - **JOIN 50 万行没走索引** → 加 `(user_id, status, created_at)` 联合索引
> - **SELECT \* 触发 filesort** → 只 SELECT 需要的列 + 加 LIMIT
> - **VARCHAR(255) 全文搜索** → ES 接管
>
> **追问点**：
> - Q: 索引是不是越多越好？→ 答：不是，写性能下降（每次 INSERT/UPDATE 要维护索引）、占用空间
> - Q: 怎么看是不是走了索引？→ 答：EXPLAIN 看 type 和 key 列；type=ref/range 是索引扫描，type=ALL 是全表扫

---

## 第 4 类：缓存（Redis 4 题）

### Q17：三级缓存怎么设计？一致性怎么保证？

**回答**：

> ```
> Browser CDN/SWR  →  L1 (Caffeine 进程内)  →  L2 (Redis 分布式)  →  L3 (MySQL)
> ```
>
> - **L1 (Caffeine)**：~100 MB 堆内缓存，TTL 5-30 分钟，热点 key 用 `expireAfterWrite`
> - **L2 (Redis)**：~10 GB 分布式缓存，TTL 30-60 分钟，多节点共享
> - **L3 (MySQL)**：权威源
>
> **Cache-Aside** 策略：
> 1. 读：L1 → L2 → L3，回填
> 2. 写：先写 L3，**再失效** L1 + L2（不是更新缓存）
> 3. **延迟双删**：写后 500ms 再删一次缓存（防读写并发导致脏数据）
>
> **追问点**：
> - Q: 为什么用 Cache-Aside 不用 Write-Through？→ 答：Write-Through 写性能差（每次写都同步写多级缓存）
> - Q: 缓存击穿？→ 答：Redis `SETNX` 分布式锁 + Caffeine `LoadingCache` 自动加载
> - Q: 缓存雪崩？→ 答：TTL 加随机偏移（5±1 分钟）
> - Q: hotkey 探测？→ 答：Redis Stream + LFU 计数器，top-1% key 加长 TTL

### Q18：Redis 缓存的 key 怎么设计？namespace 怎么管？

**回答**：

> ```
> zhiyu:module:entity:field:id
> ```
>
> 示例：
> - `zhiyu:user:profile:123` → 用户 123 的 profile
> - `zhiyu:post:counter:456:like` → 帖子 456 的点赞数
> - `zhiyu:feed:hot:user:123` → 用户 123 的热门 feed
> - `zhiyu:lock:sms:13800138000` → 短信发送分布式锁
>
> **追问点**：
> - Q: 大 key 怎么办？→ 答：拆 hash 字段（按日期或 id mod 16），单 hash < 1MB
> - Q: 热 key？→ 答：Caffeine L1 + Redis 多副本读 + 客户端本地缓存
> - Q: 多 key 原子？→ 答：Lua 脚本（Redis 5+ 用 `EVAL`）

### Q19：Redis 分布式锁怎么实现？Redlock 知道吗？

**回答**：

> 我们用 **Redis SETNX + Lua 释放**（Redlock 没用）。
>
> ```lua
> -- 获取锁
> if redis.call('SET', KEYS[1], ARGV[1], 'NX', 'PX', ARGV[2]) then
>   return 1
> end
> return 0
> ```
>
> ```lua
> -- 释放锁（Lua 保证原子）
> if redis.call('GET', KEYS[1]) == ARGV[1] then
>   return redis.call('DEL', KEYS[1])
> end
> return 0
> ```
>
> 关键点：
> 1. **每个锁带 UUID token**——A 加的锁不会被 B 误删
> 2. **Lua 保证检查+删除原子**——避免 GET 后过期被其他进程加锁再 DEL 错锁
> 3. **PX 毫秒 TTL**——避免死锁
>
> **追问点**：
> - Q: Redlock 是什么？→ 答：Redis 作者 antirez 提的算法，在 N 个独立 Redis 集群加锁（多数成功才算）
> - Q: 为什么不用 Redlock？→ 答：Martin Kleppmann 反驳过 Redlock 时钟漂移问题；我们单 Redis + Lua 够
> - Q: ZK 分布式锁？→ 答：Zab 一致性更强但性能差（10K vs Redis 100K）

### Q20：Redis 集群方案用过哪些？数据怎么分片？

**回答**：

> - **Cluster**（16384 slot）：`CRC16(key) % 16384` 分配 slot，slot 分配到不同 master
> - **Sentinel**（高可用）：主从切换 + 故障检测
> - **Twemproxy**（代理层）：客户端透明
>
> 我们用 **Cluster**，分片策略：
> - 业务数据（user profile / post cache）：按 `id` 分
> - 计数（counter）：按 `post_id` 分
> - 会话（token / sms code）：按 `user_id` 分
>
> **追问点**：
> - Q: 跨 slot 事务怎么办？→ 答：Cluster 不支持多 slot 事务，**用 hash tag** `{user_id}.profile`、`{user_id}.session` 强制同 slot
> - Q: Redis cluster 迁移数据？→ 答：`redis-cli --cluster reshard` 渐进式迁移

---

## 第 5 类：消息队列 Kafka（4 题）

### Q21：Kafka 怎么保证消息不丢？

**回答**：

> Kafka 不丢消息**三层保证**：
> 1. **Producer 端**：`acks=all`（等所有 in-sync replica 写完）+ `enable.idempotence=true`（幂等防重复）+ `max.in.flight.requests.per.connection=1`
> 2. **Broker 端**：`replication.factor ≥ 3` + `min.insync.replicas ≥ 2`
> 3. **Consumer 端**：手动提交 offset（`enable.auto.commit=false` + `ack-mode=manual`）
>
> **追问点**：
> - Q: 重复消息怎么办？→ 答：MySQL `UNIQUE(user_id, post_id, action)` + `INSERT IGNORE` 幂等
> - Q: Kafka 性能瓶颈？→ 答：磁盘顺序写 + 零拷贝 sendfile
> - Q: 怎么选 partition 数？→ 答：`max(吞吐量/单 partition 吞吐, 消费者并发数)`，我们 3-6 个

### Q22：你们的点赞用 Kafka 异步写库，怎么保证最终一致性？

**回答**：

> 流程：`点赞 → Redis INCR（实时返回）→ Kafka 异步消息 → Counter 服务消费 → MySQL 落库`
>
> 一致性保证：
> 1. **Redis 实时性**：用户看到点赞 +1 立刻生效
> 2. **Kafka 持久化**：消息持久化到 broker，consumer 重启不丢
> 3. **MySQL 落库**：后台异步落库（最多延迟 1 秒）
> 4. **失败重试**：MySQL 写失败进 dead-letter 表，定时重试 3 次
> 5. **校验对账**：每天凌晨跑脚本，Redis 计数 vs MySQL 计数 diff > 阈值报警
>
> **追问点**：
> - Q: 丢消息怎么办？→ 答：consumer 启用 `auto.offset.reset=earliest` + 幂等表
> - Q: 顺序问题？→ 答：同一 userId 路由到同一 partition（partition key = userId），保证顺序
> - Q: 为什么不直接写 MySQL？→ 答：点赞 QPS 高（万级 / 秒），MySQL 写 IO 是瓶颈

### Q23：Kafka 的消费位点 offset 怎么管理？rebalance 知道吗？

**回答**：

> **offset 管理**：
> - `enable.auto.commit=true`（默认）：每 5 秒自动提交 offset
> - `enable.auto.commit=false`：手动 `commitSync()` 或 `commitAsync()`
> - 我们用**手动提交**——业务处理完再提交，**避免消息丢失**
>
> **rebalance**（消费者组重新分配分区）：
> - 触发：consumer 加入 / 离开、partition 数变化
> - 过程：暂停所有 consumer → 重新分配 → 恢复
> - **影响**：rebalance 期间 consumer 不可用，可能重复消费
>
> 我们用 `KafkaListenerContainerFactory` 设：
> ```java
> factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
> factory.getContainerProperties().setSyncCommits(true);
> ```
>
> **追问点**：
> - Q: rebalance 重复消费怎么办？→ 答：幂等表（主键去重）
> - Q: ConsumerRebalanceListener？→ 答：rebalance 前后回调，可以保存 / 清理状态
> - Q: Kafka 如何保证消息顺序？→ 答：单 partition 内有序；多 partition 需要按 key 路由到同一 partition

### Q24：Kafka 和 RabbitMQ / RocketMQ 怎么选？

**回答**：

> | 维度 | Kafka | RabbitMQ | RocketMQ |
> |---|---|---|---|
> | 吞吐 | **百万级 TPS** | 万级 TPS | 十万级 TPS |
> | 延迟 | 10-100ms | **< 10ms** | 10ms |
> | 顺序 | 分区内有序 | 单队列有序 | 严格有序 |
> | 事务 | 0.11+ 支持 | 不支持 | **支持** |
> | 生态 | 完整 | 中等 | 国内主流 |
>
> 选 Kafka 的原因：
> - 高吞吐（点赞 / 计数 / 异步事件）
> - 生态成熟（Kafka Streams / Connect / Schema Registry）
> - **回溯消费**（重置 offset 重放）——审计场景需要
>
> **追问点**：
> - Q: Kafka 缺点？→ 答：运维复杂（ZooKeeper / KRaft）、消息延迟相对较高
> - Q: RocketMQ 用过吗？→ 答：没用过，Java 社区 Kafka 更主流；RocketMQ 优势是事务消息

---

## 第 6 类：分布式与一致性（5 题）

### Q25：CAP 理论知道吗？你的系统选 CA / CP / AP？

**回答**：

> **CAP**：一致性（Consistency）、可用性（Availability）、分区容忍（Partition tolerance）。分布式系统**只能三选二**。
>
> - **CA**：放弃 P（不允许分区）——单机数据库
> - **CP**：放弃 A——ZooKeeper、etcd（分区时拒绝写）
> - **AP**：放弃 C——Cassandra、DynamoDB（分区时继续服务，最终一致）
>
> 我们系统的选择：
> - **认证服务**：CP（密码错误就拒绝，不能用陈旧数据）
> - **计数服务（点赞）**：AP（Redis 不可达时用本地缓存兜底，最终一致）
> - **AI 问答**：AP（向量库查不到时回退到全文检索，缓慢但可用）
> - **Feed 推送**：AP（Kafka 慢消费时返回稍旧 feed）
>
> **追问点**：
> - Q: BASE 理论？→ 答：Basically Available / Soft state / Eventually consistent
> - Q: 怎么选？→ 答：业务容忍不一致 → AP；业务必须强一致 → CP

### Q26：分布式事务怎么实现？用过 seata 吗？

**回答**：

> 我们用**本地消息表**（最常用方案），不用 seata（太重）。
>
> ```sql
> CREATE TABLE outbox (
>   id BIGINT PRIMARY KEY,
>   topic VARCHAR(64),
>   payload TEXT,
>   status TINYINT,  -- 0 待发送 / 1 已发送
>   created_at DATETIME
> );
> ```
>
> 流程：
> 1. 业务事务里 INSERT 一条 outbox（**同库同事务**）
> 2. 定时任务扫 status=0 的记录
> 3. 发到 Kafka，标记 status=1
> 4. 消费者幂等处理
>
> **追问点**：
> - Q: 不用 seata 2PC？→ 答：2PC 性能差（同步阻塞），且对长事务不友好
> - Q: 不用 TCC？→ 答：TCC 适合金融场景（严格 2 阶段），我们业务没那么严格
> - Q: 不用 RocketMQ 事务消息？→ 答：用了 Kafka 没换；RocketMQ 事务消息是 2PC 变种

### Q27：分布式 ID 怎么生成？Snowflake 怎么防时钟回拨？

**回答**：

> 我们用 **Snowflake**（64 bit = 1 sign + 41 时间戳 + 10 worker + 12 sequence）。
>
> ```
> 0 | 0000... | 0000000000 000000000000 | 000000000000
> ^   ^             ^                     ^
> 符号 41位ms时间戳  10位workId          12位seq
> ```
>
> 1ms 内最多 4096 个 ID（12 位 seq），单实例 419 万 / 秒。
>
> **时钟回拨防护**：
> 1. **小回拨**（< 5ms）：等待追上
> 2. **大回拨**（> 5ms）：拒绝发号，返回错误
> 3. **记录上次时间戳**：每次发号前对比，发现回拨就告警
> 4. **预留 workerId**：用 ZK / etcd 抢占 workerId
>
> **追问点**：
> - Q: 为什么不用 UUID？→ 答：UUID 是字符串（36 字符），主键占空间大 + 索引效率低
> - Q: 为什么不用 DB sequence？→ 答：性能差（每次都要查 DB）
> - Q: Leaf 知道吗？→ 答：美团的方案，Snowflake + DB segment 双模式
> - Q: workId 怎么分配？→ 答：用 ZK 持久顺序节点（每启动一个实例占一个 node）

### Q28：分布式限流怎么做？Sentinel 怎么用？

**回答**：

> 三种实现：
> 1. **网关层（Nginx）**：`limit_req_zone` 按 IP 限流
> 2. **应用层（Sentinel / Guava RateLimiter）**：按接口 / 用户限流
> 3. **分布式（Redis + Lua）**：跨实例统一限流
>
> 我们用 **Sentinel**（阿里开源）+ **Redis** 双层：
> - Sentinel：单实例 JVM 限流（滑动窗口、令牌桶、漏桶）
> - Redis：跨实例限流（`INCR` + TTL，集群总 QPS 控制）
>
> ```java
> @SentinelResource(value = "sendSms", blockHandler = "handleBlock")
> public Result sendSms(String phone) {
>     smsService.send(phone);
>     return Result.ok();
> }
> ```
>
> **追问点**：
> - Q: Sentinel vs Resilience4j？→ 答：Sentinel 规则配置化（Dashboard），更适合生产
> - Q: 限流粒度？→ 答：方法级 / URL 级 / 用户级 / IP 级
> - Q: 限流后怎么处理？→ 答：快速失败 / 排队等待 / 降级（返回缓存数据）

### Q29：分布式 Session 怎么实现？你们的方案？

**回答**：

> 我们用 **JWT 无状态** + **Redis 黑名单**（不存 Session）：
> - access token 自包含 userId，**无状态**
> - 用户登出 / 改密 → access jti 进 Redis 黑名单（TTL = token 剩余有效期）
> - 每次请求查 Redis（**O(1)** 内存读）
>
> 传统分布式 Session 方案：
> - Spring Session + Redis（HttpSession 存 Redis）
> - Spring Session + JDBC
> - JWT（无状态，最推荐）
>
> **追问点**：
> - Q: Session 复制方案？→ 答：Tomcat cluster 广播复制（性能差，已淘汰）
> - Q: 粘性 Session？→ 答：Nginx `ip_hash`，同一 IP 路由到同一机器（**不推荐**——单点故障）
> - Q: JWT 和 Session 怎么选？→ 答：JWT 适合**无状态 API / 移动端 / 跨域**；Session 适合传统 Web SSR

---

## 第 7 类：性能调优与监控（5 题）

### Q30：首问 4.8s 到 1.5s 怎么优化的？（**必问硬数据题**）

**回答**：

> | 优化点 | 节省 | 怎么做的 |
> |---|---|---|
> | Embedding 模型本地缓存 | -800ms | 启动时 bge-large-zh 加载到 Caffeine，**避免每次请求都加载** |
> | 向量索引预热 | -600ms | 启动时扫 1000 个热 chunk 进 Caffeine |
> | **流式响应** | **-1500ms** | 首 token 50ms 返回（之前要等 LLM 全部生成） |
> | Top-K 优化 | -200ms | 从 100 → 50（少算 50 个 similarity） |
> | 关键词短路 | -200ms | 高频词（"RAG"、"Spring"）直接用 BM25，跳过向量 |
>
> **追问点**：
> - Q: Embedding 加载要多久？→ 答：bge-large-zh 首次加载 ~3 秒（336MB 模型 + ONNX Runtime）
> - Q: 怎么测的？→ 答：JFR + async-profiler 看热点方法；JMeter 100 并发压测
> - Q: 4.8s 是 P50 还是 P99？→ 答：P95
> - Q: 流式响应怎么实现的？→ 答：Spring WebFlux + `produces = TEXT_EVENT_STREAM_VALUE` + 前端 EventSource

### Q31：你们的系统 QPS 多少？怎么测的？

**回答**：

> - 认证：~500 QPS（瓶颈：SMS 第三方）
> - Feed 流：~5000 QPS（Caffeine L1 命中 80%）
> - 点赞/计数：~3 万 QPS（Redis pipeline）
> - AI 问答：~50 QPS（瓶颈：LLM API + 召回）
> - 搜索：~1000 QPS（ES 集群）
>
> 压测工具：
> - **JMeter**（业务压测）
> - **wrk**（HTTP 极限）
> - **redis-benchmark**（Redis）
>
> **追问点**：
> - Q: 怎么找瓶颈？→ 答：SkyWalking 分布式追踪 + traceId 日志关联
> - Q: CPU/内存/网络/磁盘 哪个是瓶颈？→ 答：AI 推理 CPU 瓶颈；缓存 / DB IO 密集是网络 / 磁盘

### Q32：线上 OOM / 内存泄漏怎么排查？

**回答**：

> 1. **dump 内存**：jmap 或 `-XX:+HeapDumpOnOutOfMemoryError` 自动 dump
> 2. **分析工具**：MAT（Eclipse Memory Analyzer）、VisualVM、JProfiler
> 3. **看 Retained Heap** 找大对象
>
> 我项目里见过的案例：
> - **Caffeine 缓存没设最大容量** → OOM（用 `maximumSize=100_000` 限制）
> - **MyBatis 一级缓存**（`localCacheScope=SESSION`）→ 改 `STATEMENT`
> - **线程池队列无界** → OOM（必须 `new ArrayBlockingQueue<>(1000)`）
> - **Lambda 闭包引用大对象** → 内存泄漏
>
> **追问点**：
> - Q: 怎么定位代码？→ 答：MAT 的 Leak Suspects → 看 GC root 链
> - Q: 预防？→ 答：① 定期 jmap 快照对比 ② APM 监控内存曲线 ③ code review

### Q33：JVM 调优你怎么做的？常用参数？

**回答**：

> 我们生产 JVM 参数（Docker 启动）：
> ```
> -Xms512m -Xmx1024m          # 堆内存（容器限制 1G）
> -XX:+UseG1GC                 # G1 垃圾回收器（替代 CMS）
> -XX:MaxGCPauseMillis=200     # 最大 GC 停顿 200ms
> -XX:+UseStringDeduplication  # String 去重
> -Xlog:gc*:file=gc.log       # GC 日志
> -XX:+HeapDumpOnOutOfMemoryError
> -XX:HeapDumpPath=/var/log/
> -Dfile.encoding=UTF-8
> ```
>
> **追问点**：
> - Q: G1 vs ZGC vs Shenandoah？→ 答：G1 成熟（Java 9+ 默认），ZGC/Shenandoah 超低延迟（Java 11+）但需要更多 CPU
> - Q: 怎么选 Xmx？→ 答：容器总内存的 50-70%（给 OS / 缓存 / 堆外留余量）
> - Q: 怎么看 GC 效果？→ 答：`jstat -gcutil <pid> 1000` 看 FGC 频率 / YGC 平均耗时
> - Q: OOM 怎么自动通知？→ 答：`-XX:+HeapDumpOnOutOfMemoryError` 自动 dump + 监控告警脚本

### Q34：Prometheus + Grafana 监控怎么做的？关键指标？

**回答**：

> **指标四类**（RED + USE）：
> - **请求级（RED）**：Rate / Errors / Duration
> - **资源级（USE）**：Utilization / Saturation / Errors
> - **业务级**：DAU / 转化率 / 留存
> - **JVM 级**：堆 / GC / 线程
>
> 关键指标：
> - HTTP：`http_requests_total{method, status, uri}` P50/P95/P999 延迟
> - JVM：`jvm_memory_used_bytes{area="heap"}`、`jvm_gc_pause_seconds`
> - DB：`hikaric_connections_active`、`hikaric_connections_pending`
> - Redis：`redis_commands_total`、`redis_memory_used_bytes`
>
> 我们用 **Spring Boot Actuator + Micrometer + Prometheus**：
> ```yaml
> management.endpoints.web.exposure.include: health,info,metrics,prometheus
> ```
>
> **追问点**：
> - Q: 告警阈值怎么设？→ 答：P99 > 1s 告警、错误率 > 1% 告警、CPU > 80% 持续 5min 告警
> - Q: 怎么定位一次慢请求？→ 答：traceId 串联 SkyWalking + 慢请求日志

---

## 第 8 类：搜索 & Elasticsearch（3 题）

### Q35：你们的 ES 向量索引怎么设计？维度多少？为什么？

**回答**：

> ```json
> {
>   "mappings": {
>     "properties": {
>       "post_id": { "type": "long" },
>       "chunk_id": { "type": "keyword" },
>       "content": { "type": "text", "analyzer": "ik_smart" },
>       "content_vector": {
>         "type": "dense_vector",
>         "dims": 1024,
>         "index": true,
>         "similarity": "cosine"
>       },
>       "title": { "type": "text" },
>       "tags": { "type": "keyword" }
>     }
>   }
> }
> ```
>
> 选 1024 维：
> - bge-large-zh-v1.5 是 1024 维（中文 SOTA）
> - 维度越高越准，但**存储 × 4 倍**（float32），100 万 chunk × 1024 × 4 = 4GB 内存
> - 768 维（OpenAI text-embedding-3-small）也可以，但中文不如 bge
>
> **追问点**：
> - Q: cosine 还是 dot_product？→ 答：cosine（标准做法，对向量长度不敏感）
> - Q: 索引预热？→ 答：ES `_refresh` + `forcemerge` 段合并 + 缓存热查询
> - Q: HNSW 参数？→ 答：`"index_options": {"type": "int8_hnsw", "m": 16, "ef_construction": 100}`（ES 8 默认）

### Q36：ES search_after 怎么用？深分页怎么优化？

**回答**：

> ```json
> POST /knowposts/_search
> {
>   "size": 20,
>   "query": {...},
>   "sort": [
>     {"created_at": "desc"},
>     {"_id": "asc"}  // tiebreaker
>   ],
>   "search_after": [1714003200000, "abc123"]  // 上一页最后一条的 sort 值
> }
> ```
>
> 流程：
> 1. 第一次请求不带 `search_after` → 响应带 `sort` 数组（最后一条的 sort 值）
> 2. 第二次请求把 sort 值传 `search_after` → 从这里继续
>
> **追问点**：
> - Q: 为什么不用 from+size？→ 答：shard 数 × from 累计放大；1000 shard × from=10000 = 1000万
> - Q: 怎么保证不丢？→ 答：tiebreaker（`_id`）保证排序稳定
> - Q: search_after 不能跳页？→ 答：对，只能"上一页 → 下一页"，不能跳到第 50 页
> - Q: 实时性？→ 答：search_after 期间新数据会"插队"（cursor 是上一页最后一条的 sort 值），可能重复

### Q37：IK 分词器怎么用？自定义词典怎么加？

**回答**：

> ES 中文分词默认是**单字切**（效果差），我们用 **IK Analyzer**（medcl 大神开源）。
>
> ```json
> {
>   "settings": {
>     "analysis": {
>       "analyzer": {
>         "ik_smart": { "type": "ik_smart" },
>         "ik_max_word": { "type": "ik_max_word" }
>       }
>     }
>   }
> }
> ```
>
> ik_smart（粗粒度）vs ik_max_word（细粒度）：
> - ik_smart 用于索引（召回率高）
> - ik_max_word 用于搜索（精确度高）
>
> **自定义词典**：
> 1. 创建 `analysis-ik/extra_main.dic` 放入自定义词
> 2. 挂载到 ES 容器
> 3. 重启 ES 加载词典
>
> **追问点**：
> - Q: IK 词典文件在哪？→ 答：`/usr/share/elasticsearch/plugins/analysis-ik/config/`
> - Q: 怎么热加载？→ 答：IK 1.x+ 支持 HTTP API 远程词典
> - Q: 不用 IK 用什么？→ 答：HanLP、Jieba、THULAC（学术派）；IK 工业界最稳

---

## 第 9 类：RAG / Agent（6 题，**重点**）

### Q38：你的 RAG 召回率从 78% 怎么到 92%？做了哪些优化？（**必追问**）

**回答**：

> 我们的 92% 是 **Top-5 召回率**（ground truth 命中数 / 真实相关数）。
>
> | 阶段 | Top-5 召回率 | RT | 关键优化 |
> |---|---|---|---|
> | V1 baseline | 78% | 4.8s | Embedding + 简单切块 |
> | V2 切块优化 | 85% | 3.2s | Markdown 按标题切 + 重叠 |
> | V3 重排序 | 89% | 2.8s | 加 bge-reranker-large |
> | V4 混合检索 | 92% | 1.5s | 向量 + BM25 + RRF 融合 |
>
> **V2 切块优化**（最关键）：
> - 之前：固定 500 字符切块（破坏语义）
> - 现在：按 Markdown 标题切（H1/H2/H3），重叠 50 字符，块大小 200-800 token
> - 单篇 5-10 个块
>
> **V3 重排序**：
> - 第一阶段：双塔模型 bge-large-zh 召回 100 个候选
> - 第二阶段：bge-reranker-large 精排 → Top-5
> - 重排序模型交叉注意力比双塔模型准 15%
>
> **V4 混合检索**（最有效）：
> - 向量（语义）+ BM25（关键词）→ **RRF (Reciprocal Rank Fusion)** 融合
> - 公式：`score = 1/(60 + vector_rank) + 1/(60 + bm25_rank)`
> - 对专有名词、缩写（"RAG" "Spring AI"）特别有效
>
> **追问点**：
> - Q: 召回率怎么测的？→ 答：人工标注 200 个 query-answer 对（覆盖高频），用 NDCG@5 / Recall@5 / MRR 指标；定期回归测试
> - Q: 4.8s → 1.5s 怎么做的？→ 答：① Embedding 缓存 ② 向量索引预热 ③ 流式响应 ④ Top-K 限制
> - Q: 怎么评估 Embedding 模型？→ 答：MTEB 中文榜（C-MTEB），选 bge-large-zh-v1.5

### Q39：RAG 和传统搜索有什么区别？为什么需要 RAG？

**回答**：

> - **传统搜索**：基于关键词 + BM25（Lexical Search）
>   - 优点：精确匹配（API 文档、产品名）
>   - 缺点：**不理解语义**（搜"苹果"不知道是水果还是公司）
> - **RAG（Retrieval-Augmented Generation）**：
>   - 把问题 Embedding 向量化
>   - 向量库找**语义相关**的 Top-K
>   - 把文档 + 问题塞给 LLM，让 LLM **基于文档**回答
>   - 优点：能"理解"语义，能综合多文档，**有出处**
>   - 缺点：成本高、延迟大
>
> **追问点**：
> - Q: Embedding 模型怎么选？→ 答：MTEB 中文榜前 3（bge-large-zh / m3e-large / text-embedding-3-small）
> - Q: 为什么 ES 不用 Milvus？→ 答：已有 ES 集群省运维；ES 8 向量检索 Recall@10 跟专用差距 < 3%
> - Q: 不用 fine-tuning？→ 答：成本高；RAG 灵活

### Q40：怎么解决大模型幻觉（hallucination）问题？

**回答**：

> **4 层防护**：
> 1. **Prompt 约束**：
>    ```
>    你是一个知识问答助手。严格基于"参考资料"回答。
>    - 资料里有答案：直接引用 [1][2]
>    - 资料里没答案：明确说"抱歉，知识库没有"
>    - 禁止编造
>    ```
> 2. **RAG 兜底**：检索 0 个相关文档 → 直接返回"无答案"，不调 LLM
> 3. **回答溯源**：附 [1][2] 引用编号，用户可点跳原文
> 4. **用户反馈**：点赞/点踩/举报，badcase 进微调数据集
>
> **追问点**：
> - Q: RAG 不够怎么办？→ 答：上 Agent + Function Calling，让 LLM 调工具
> - Q: 微调 vs RAG？→ 答：领域知识用 RAG（实时更新）；风格 / 格式用 fine-tuning（一次训练）
> - Q: temperature 怎么设？→ 答：知识问答 0.1-0.3（精确），创意生成 0.7-0.9（多样）

### Q41：SSE（Server-Sent Events）流式输出怎么实现？前后端怎么配合？

**回答**：

> **后端**（Spring WebFlux）：
> ```java
> @GetMapping(value = "/{id}/qa/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
> public Flux<String> qaStream(@PathVariable long id, @RequestParam String question) {
>     return ragService.streamAnswerFlux(id, question, 5, 1024);
> }
> ```
>
> **前端**：
> ```javascript
> const es = new EventSource(`/api/v1/knowposts/${id}/qa/stream?question=xxx`);
> es.onmessage = (e) => { content += e.data; render(); };
> es.onerror = () => es.close();
> ```
>
> SSE 协议：`data: {chunk}\n\n`（每行 `data:` 前缀 + 双换行结束）
>
> **追问点**：
> - Q: SSE vs WebSocket？→ 答：SSE 单向（server→client），WebSocket 双向；问答场景 SSE 够用
> - Q: 为什么不用 chunked transfer？→ 答：SSE 是 chunked 的标准化（带 `event:` `id:` `data:` 字段）
> - Q: Spring SSE 异常？→ 答：`@ExceptionHandler` 默认返回 JSON，但 EventSource 期望 `text/event-stream` → 需根据 Accept 头分流

### Q42：Spring AI 怎么集成 Spring Boot？用过哪些模块？

**回答**：

> **用过**：
> - `spring-ai-starter-model-openai`（DeepSeek 协议兼容）
> - `spring-ai-starter-vector-store-elasticsearch`
> - `spring-ai-model-deepseek`
>
> **核心抽象**：
> - **`ChatClient`**：高层 API，链式调用
>   ```java
>   chatClient.prompt().system(prompt).user(msg).stream().content()
>   ```
> - **`EmbeddingModel`**：文本 → 向量
> - **`VectorStore`**：统一向量 CRUD 接口
>
> **Spring AI 设计模式**：
> - `ChatModel` 接口 + 多实现（Strategy 模式）
> - `MessageConverter` 处理不同协议
> - `ObservationRegistry` Micrometer 埋点
>
> **追问点**：
> - Q: 怎么换 LLM？→ 答：改 application.yml 的 `spring.ai.openai.base-url` + `api-key`
> - Q: Function Calling 用过吗？→ 答：用过，给 ChatClient 配 `@Tool` 注解的方法

### Q43：Agent 和 RAG 区别？你的项目里有 Agent 吗？

**回答**：

> - **RAG**：**检索** + **生成**——LLM 基于检索文档回答
> - **Agent**：LLM 自己**思考**该做什么 → 调工具 / 查数据库 / 调 API → **多轮决策**
>
> 项目里有**简化版 Agent**（在 AI 问答 Controller）：
> - LLM 根据用户问题，**自动判断**调哪个工具：
>   - 调"知文搜索"工具（向量检索）
>   - 调"用户搜索"工具
>   - 调"按时间排序"工具
> - 工具执行结果再喂给 LLM 综合回答
>
> ```java
> List<ToolCallback> tools = List.of(
>     ToolCallback.builder().name("searchPost").description("搜索知文").callHandler(...)
> );
> chatClient.prompt().tools(tools).user(question).stream().content();
> ```
>
> **追问点**：
> - Q: ReAct 知道吗？→ 答：Reason + Act 循环：LLM 思考 → 调工具 → 观察 → 再思考；Spring AI 1.0+ 内置
> - Q: 多 Agent 协作？→ 答：主 Agent + 子 Agent 编排（LangGraph / Spring AI Graph）

---

## 第 10 类：架构设计（4 题）

### Q44：为什么选 Spring Boot 3 + Java 21？

**回答**：

> - **Java 21 LTS**（支持到 2031）
> - **虚拟线程（Virtual Threads）**：高并发 I/O 场景性能提升 5-10 倍，无需改业务代码
> - **Pattern Matching**：代码更简洁
> - **Records**：减少 POJO 样板
> - **Spring Boot 3**：Jakarta EE 9
> - **Spring AI 1.0**：原生 LLM 集成
>
> **追问点**：
> - Q: 虚拟线程 vs WebFlux？→ 答：虚拟线程同步写法但性能异步，团队学习成本低
> - Q: 为什么不选 Go？→ 答：Spring AI 生态 Go 还没替代品；招聘难度 Go > Java

### Q45：你们的架构怎么演进？单体还是微服务？

**回答**：

> **当前是模块化单体**（按 feature 拆包，不按微服务拆）：
> ```
> com.comioko.auth        com.comioko.knowpost
> com.comioko.llm         com.comioko.search
> com.comioko.counter     com.comioko.user
> com.comioko.relation
> ```
>
> 单体优势：部署简单、跨模块事务方便、IDE 重构快
>
> **未来微服务拆分计划**：
> - `auth-service`（独立部署，公网入口）
> - `content-service`（核心，独立扩）
> - `ai-service`（GPU 资源独立）
> - `counter-service`（Redis 写密集）
>
> **追问点**：
> - Q: 怎么拆？→ 答：绞杀者模式（Strangler Fig Pattern）—— 新功能用微服务，旧功能保留，逐步迁移
> - Q: 分布式事务？→ 答：本地消息表 + 最终一致性（不用 seata 2PC）

### Q46：Spring Boot 怎么接入 LLM？Function Calling 怎么实现？

**回答**：

> **Spring AI 接入**：
> ```yaml
> spring:
>   ai:
>     openai:
>       base-url: https://api.deepseek.com  # OpenAI 兼容
>       api-key: ${DEEPSEEK_API_KEY}
>       chat:
>         options:
>           model: deepseek-chat
> ```
>
> **Function Calling**：
> ```java
> @Bean
> @Description("搜索知文")
> public Function<SearchRequest, List<SearchResult>> searchPostTool() {
>     return req -> knowpostService.search(req.getQuery());
> }
>
> chatClient.prompt()
>     .tools("searchPostTool", "userSearchTool")
>     .user(question)
>     .call()
>     .content();
> ```
>
> LLM 看到 function description 后**自动判断**调哪个工具，Spring AI 自动处理 schema 生成 + 解析返回。
>
> **追问点**：
> - Q: Function Calling 怎么防 prompt 注入？→ 答：① description 严格定义参数 ② 工具结果再次喂给 LLM 验证
> - Q: 怎么调试？→ 答：Spring AI 内置 `ObservationRegistry` 记录每次工具调用

### Q47：你们的部署流程是什么？CI/CD 怎么做的？

**回答**：

> - **CI**（GitHub Actions）：跑 mvn test + Flyway 集成测试
> - **CD**（GitHub Actions → 阿里云容器镜像服务 ACR）：构建 Docker 镜像推 ACR
> - **生产部署**：ECS 拉镜像 `docker compose pull && up -d`
>
> 我们也用 `docker-compose.yml`：
> - 启动 MySQL/Redis/Kafka/ES（5 个中间件）
> - 启动 backend（Spring Boot 容器）
> - 启动 frontend（Nginx 容器）
>
> **追问点**：
> - Q: 蓝绿部署？→ 答：项目小没必要；未来用户多了用 K8s + ArgoCD
> - Q: 滚动升级？→ 答：Docker `--force-recreate` 强制重建（Spring Boot 启动快 30 秒）
> - Q: 数据库迁移怎么回滚？→ 答：Flyway 只能 forward（V1→V2 不能 V2→V1），上线前必须备份

---

## 第 11 类：行为面试 & 软技能（3 题）

### Q48：为什么独立开发而不是去大厂？

**回答**：

> 1. 想要**全栈**经验——大厂分工细，独立项目能接触前后端 + 部署 + 运维
> 2. **学习深度**——独立项目要为自己每个决策负责，成长快
> 3. 想做**有用户使用**的产品，而不是大厂内部系统
> 4. 时间灵活（准备面试的同时也维护这个项目）

### Q49：你最大的优点 / 缺点是什么？

**回答**：

> **优点**：
> - **数据驱动**——不拍脑袋，每个优化都有数据支撑（Q38 92%、Q30 1.5s 都有具体数字）
> - **可观测性**——每个服务都有日志 / 指标 / 链路追踪
>
> **缺点**：
> - **完美主义倾向**——早期 over-engineer，现在学会 MVP 优先
> - **技术更新焦虑**——AI 领域每周都有新东西

### Q50：你有什么想问我的？（反问）

**反问技巧**（5 个备选）：

> 1. "团队现在 AI 应用的成熟度？RAG 还是有更高级的 Agent 框架？"
> 2. "后端技术栈是 Java 还是 Go？Spring 全家桶还是 Dubbo？"
> 3. "这个岗位的核心痛点？性能优化、新功能上线、还是稳定性？"
> 4. "团队规模多大？我入职后会负责哪个模块？"
> 5. "公司对 AI 工程师的期望是落地业务，还是研究新算法？"
>
> **避免**：
> - ❌ "薪资多少？"（HR 面再问）
> - ❌ "加班多吗？"（负面）
> - ❌ "我面的什么级别？"

---

## 面试前一晚准备清单

- [ ] 复习 5 个核心数据（**92% / 1.5s / 30% / 0.3s / 4.8s**）的计算方式
- [ ] 每个数据准备"怎么测出来的"
- [ ] STAR 法则讲 2-3 个项目难点故事（AI 召回率优化 / 计数器内存优化 / SSE 兼容性 bug）
- [ ] 准备好 RAG demo（可现场展示）
- [ ] 复习 Spring Boot Bean 生命周期（Q7 高频）
- [ ] 复习数据库联合索引（Q13）
- [ ] 复习 Kafka 不丢消息（Q21）
- [ ] 复习 Redis 分布式锁（Q19）
- [ ] 准备好 3 个反问问题
- [ ] 项目 README 写清楚架构图

---

## 重点题标记（面试 100% 必问）

| 题号 | 题目 | 重要性 |
|---|---|---|
| Q1 | 3 分钟项目介绍 | ★★★★★ |
| Q4 | JWT 双令牌模式 | ★★★★★ |
| Q12 | 千万级计数器 Redis SDS 节省 30% 内存 | ★★★★★ |
| Q38 | RAG 召回率 78% → 92% 4 阶段优化 | ★★★★★ |
| Q30 | 首问 4.8s → 1.5s 5 个优化点 | ★★★★★ |
| Q40 | 怎么解决大模型幻觉 | ★★★★ |
| Q41 | SSE 流式输出前后端配合 | ★★★★ |
| Q43 | Agent 和 RAG 区别 | ★★★★ |
| Q25 | CAP 理论系统选型 | ★★★★ |

---

> 文档生成时间：2026-07
> 适配岗位：后端开发（70%）+ Agent 开发（30%）
> 文档基于项目实际技术栈（Spring Boot 3 + Spring AI + MySQL + Redis + Kafka + ES）
