# 知域社区项目面试题库

> 岗位：后端开发（70%）+ Agent 开发（30%）
> 项目周期：2025.12 - 2026.3
> 技术栈：Spring Boot 3 + Spring AI + RAG + MySQL + MyBatis + Redis + Kafka + Elasticsearch
> 项目地址：https://github.com/comioko/zhiyu

## 项目核心数据（面试时主动提）

| 指标 | 数值 | 实现 |
|---|---|---|
| AI 问答 Top-5 召回率 | 92% | RAG + embedding rerank + chunk 切分 |
| AI 首问 RT | 4.8s → 1.5s | 向量索引预热 + Caffeine 本地缓存 + 流式输出 |
| 计数服务内存 | 节省 30% | Redis SDS 自定义编码（替代 String） |
| Feed 缓存 | 三级 | L1 Caffeine + L2 Redis + L3 浏览器 |
| 搜索联想 RT | search_after 深分页 | ES search_after 替代 from+size |

---

## 第一部分：项目介绍（开场必问）

### Q1：请用 3 分钟介绍下这个项目？

**回答模板**：

> 这个项目叫**知域社区**（github.com/comioko/zhiyu），是一个**面向终身学习者的知识分享社区**，类似小红书 + 知乎的结合体。我作为独立开发者，从 2025 年 12 月到 2026 年 3 月完成了从架构设计到上线的全流程。
>
> 主要包含五大模块：
> 1. **认证系统**：短信验证码 + 密码策略 + JWT 双令牌模式（access 15min + refresh 7d）
> 2. **内容系统**：知文（图文+视频混排）、Feed 流、点赞收藏、关注关系
> 3. **AI 问答系统**：基于 RAG 的知文智能问答（Spring AI + ES 向量库 + DeepSeek）
> 4. **搜索系统**：基于 ES 的全文检索 + 联想词
> 5. **计数系统**：千万级用户的内容计数器（Redis SDS 自定义编码）
>
> 我个人最满意的设计是**AI 问答系统的 RAG 召回优化**——从最初版的首问 4.8 秒、Top-5 召回率 78% 优化到 1.5 秒、92%。

### Q2：你这个项目是独立开发的吗？团队多大？代码量多少？

**回答**：

> 是的，**独立开发**（个人项目）。后端 50+ 模块，约 1.5 万行 Java 代码；前端 React + TypeScript，约 1 万行 TS/TSX 代码。MySQL 25 张表、Redis 7 种数据结构、3 个 Kafka topic、ES 1 个向量索引（768 维）。

---

## 第二部分：后端开发（70% 重点）

### Q3：JWT 的双令牌模式是怎么设计的？为什么要 refresh token？

**回答**：

> 单 token 有两个问题：
> 1. **access token 泄露风险高**——前端存在 localStorage，XSS 攻击可以拿到
> 2. **短 access token 频繁过期**——用户体验差，要反复登录
>
> 我的设计：
> - **access token**：15 分钟过期，**无状态**（自包含 userId + role），用 RS256 签名
> - **refresh token**：7 天过期，**有状态**（Redis 存 `refresh_token:{userId}:{jti}` → userId 映射）
> - **刷新机制**：access 过期前端用 refresh 调 `/auth/token/refresh`，后端验证 refresh 后返回新 access + 新 refresh（**rotate**，旧的进黑名单）
> - **登出**：后端删除 refresh + 把 access jti 加入 Redis 黑名单（到 access 过期时间）
>
> **追问点**：
> - Q: refresh token 怎么防重放？→ 用 `jti`（JWT ID）作唯一标识，Redis 存 jti，**每次刷新后旧 jti 失效**
> - Q: 如果 access token 还在有效期内但被泄露？→ 答：靠黑名单机制，用户主动登出时拉黑 jti 到过期；被动泄露靠短 TTL 缓解
> - Q: 为什么不只用 refresh token 不用 access？→ 答：每次请求都查 Redis 性能差；access 无状态更快

### Q4：你们的密码策略是什么？存密码用什么算法？

**回答**：

> 密码策略：
> - 长度 ≥ 8 位
> - 必须包含字母 + 数字
> - 登录失败 5 次锁定 30 分钟（Redis 计数器 `login_fail:{userId}`）
> - 传输层 HTTPS
>
> 存储算法：**BCrypt**（Spring Security 默认），cost = 10（`BCryptPasswordEncoder`）
>
> **追问点**：
> - Q: 为什么用 BCrypt 不用 MD5/SHA1？→ 答：MD5/SHA1 太快（GPU 每秒数十亿次），易被彩虹表；BCrypt 慢且加盐（每次 salt 不同），抗暴力破解
> - Q: 不用 Argon2 吗？→ 答：Argon2 安全性更高但 Spring Security 默认 BCrypt，且我们单机 QPS 够用；如果未来要扛更大压力可以切 Argon2
> - Q: salt 怎么存？→ 答：BCrypt 自动生成 16 字节 salt 存在 hash 输出里（`$2a$10$<22-char-salt><31-char-hash>`）

### Q5：你们的短信验证码怎么设计？防刷、防盗用？

**回答**：

> - **生成**：6 位数字，**SecureRandom** 生成，存 Redis `sms_code:{phone}` → 5 分钟 TTL
> - **发送频率限制**：同一个手机号 1 分钟内最多 1 条，1 天内最多 10 条（Redis 计数器）
> - **验证**：调 `/auth/send-code` 时先检查发送频率，超限返 429；用户输入的验证码用 `String.equals()` 比较（**注意不能 equals 防止时序攻击** → 用 `MessageDigest.isEqual`）
> - **一次性**：验证成功后立即删除 Redis key（DEL），同一个码只能用一次
> - **风控**：异地 IP 短时间内多次请求验证码 → 触发图形验证码
>
> **追问点**：
> - Q: 验证码用 HMAC 还是明文存 Redis？→ 答：明文存 Redis（5 分钟过期，且 Redis 本身有 ACL）；但生产环境用 `sms_code_hash:{phone}` → SHA256(原始码) 更安全，避免 Redis 全量导出泄露
> - Q: 短信服务商怎么选？防刷阈值怎么定？→ 答：阿里云短信 + 腾讯云备用；阈值是经验值（同 1 分钟 1 条），后续根据业务数据调

### Q6：讲讲 Spring Boot 的 Bean 生命周期？

**回答**（**背这个流程图**）：

> 1. **实例化（Instantiation）**：调用构造方法（默认无参），推断构造方法
> 2. **属性填充（Populate）**：@Autowired / @Resource 注入依赖
> 3. **初始化（Initialization）**：
>    - `@PostConstruct` 方法
>    - `InitializingBean.afterPropertiesSet()`
>    - 自定义 `init-method`
> 4. **使用（Ready）**：放入 BeanFactory 单例池
> 5. **销毁（Destruction）**（容器关闭时）：
>    - `@PreDestroy` 方法
>    - `DisposableBean.destroy()`
>    - 自定义 `destroy-method`
>
> **应用**：我在 `RagConfig` 里用 `BeanPostProcessor` 拦截 `@ConditionalOnExpression` 时机——因为 Spring AI 的 bean 在 Refresh 阶段后期才创建，配置类加载太早导致 `@ConditionalOnBean` 不可靠。**改用 `@ConditionalOnExpression` SpEL 在 Environment 阶段判断**。
>
> **追问点**：
> - Q: BeanPostProcessor 和 BeanFactoryPostProcessor 区别？→ 答：BFP 是 Bean 级别（在 Bean 实例化前后回调），BFFP 是 BeanDefinition 级别（修改 Bean 定义）
> - Q: 循环依赖怎么解决？→ 答：三级缓存（singletonObjects、earlySingletonObjects、singletonFactories）；构造器注入无法解决循环依赖（因为实例化前就要 bean）
> - Q: @PostConstruct 和 afterPropertiesSet 哪个先？→ 答：@PostConstruct（JSR-250 规范）→ InitializingBean.afterPropertiesSet() → 自定义 init-method

### Q7：Spring Boot 启动慢怎么排查？

**回答**：

> 我排查过 Spring AI bean 加载时序问题（Bean 条件依赖不可靠），常用工具：
>
> 1. **`spring-boot-starter-actuator`**：暴露 `/actuator/startup` endpoint，需要 `application.yml` 加 `management.startup-tracking.enabled=true`
> 2. **`@Lazy` / `Async` 注解**：延迟加载非关键 bean
> 3. **`spring.profiles.active=prod`**：禁用 dev tools（`spring-boot-devtools`）
> 4. **`-Ddebug` 或 `DEBUG` 日志**：看 `ConditionEvaluationReport`（你日志里见过）
> 5. **`/actuator/beans`**：列出所有 bean 及其依赖关系
> 6. **`/actuator/conditions`**：所有 `@Conditional` 评估结果（**最有用**）
>
> 我项目优化后的启动时间：
> - 关 AI：~30 秒（DB + Redis + Kafka + ES + Flyway）
> - 开 AI：~3 分钟（OpenAI Embedding model 加载 + 向量库 schema 初始化）

---

## 第三部分：数据库设计（高频题）

### Q8：你的 users 表是怎么设计的？为什么 phone 和 email 都加唯一索引？

**回答**：

> ```sql
> CREATE TABLE users (
>     id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
>     phone VARCHAR(32) NULL UNIQUE,
>     email VARCHAR(128) NULL UNIQUE,
>     zg_id VARCHAR(64) NULL UNIQUE,  -- 知域 ID（@xxx）
>     password_hash VARCHAR(128) NULL,
>     nickname VARCHAR(64) NOT NULL,
>     avatar VARCHAR(512) NULL,
>     ...
> )
> ```
>
> 设计要点：
> 1. **id 选 BIGINT UNSIGNED**：未来用户量超 21 亿（AUTO_INSIGNED 极限），UNSIGNED 给 2 倍空间
> 2. **phone / email 各自 UNIQUE 但都允许 NULL**：用户可能只填手机不填邮箱，MySQL UNIQUE 允许多个 NULL
> 3. **zg_id 也 UNIQUE**：作为短链用户 ID 分享，比 userId（数字）更友好
> 4. **utf8mb4 + utf8mb4_unicode_ci**：支持 emoji（昵称常有😀）
>
> **追问点**：
> - Q: 为什么不分库分表？→ 答：当前 50 万用户以下单机 MySQL 够用；预计到 1000 万时按 `id % 64` 水平分库
> - Q: 软删除 vs 硬删除？→ 答：用户表用软删除（`deleted_at`），符合 GDPR "被遗忘权"但保留审计
> - Q: 用户名（nickname）为什么不是 UNIQUE？→ 答：昵称可以重名（小红书也允许），但 zg_id（@xxx）必须唯一

### Q9：Feed 流分页怎么实现？上拉加载会重复/丢失吗？

**回答**：

> 用 **cursor-based pagination（游标分页）**，**不是**传统的 OFFSET。
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
> **优势**：
> - O(log n) 用主键索引，**O(1) 复杂度**
> - 新发的帖子不会插队（OFFSET 会重复或丢失）
>
> **前端配合**：
> - 第一次请求不带 cursor，响应带 `next_cursor`
> - 第二次请求带 `?cursor=12345`
> - 服务端 `id < cursor` 查询
>
> **追问点**：
> - Q: 关注关系变化怎么处理？→ 答：cursor 是全局唯一 id（不是 user-scope），新关注的用户从下一页出现，不会重复
> - Q: 怎么保证不丢？→ 答：cursor 模式天然稳定（id 单调递增）；OFFSET 模式新数据插队会丢
> - Q: 删除中间的帖子？→ 答：`id < cursor` 用小于号（不是 ≤），被删的帖子自动跳过

### Q10：千万级计数器怎么做？Redis SDS 怎么省内存？

**回答**：

> 场景：每篇知文有点赞数、收藏数、阅读数。用户每次操作都 +1 / -1，单 MySQL 扛不住。
>
> **方案对比**：

| 方案 | QPS | 内存 | 一致性 |
|---|---|---|---|
| MySQL `UPDATE table SET count = count + 1` | ~1k | 低 | 强 |
| Redis `INCR` 字符串 | 10w+ | 高（1 key = 40+ bytes） | 弱（需异步落库） |
| Redis Hash `HINCRBY` | 10w+ | 中 | 弱 |
| **Redis SDS 自定义编码** | 10w+ | **低**（节省 30%） | 弱 |
>
> **我们的方案**（节省 30% 内存）：
> 1. **value < 256 用 uint8**（1 byte）
> 2. **256 ≤ value < 65536 用 uint16**（2 bytes）
> 3. **value ≥ 65536 用 uint32**（4 bytes）
> 4. **key 加 4-bit type tag** 区分类型
>
> 用 Lua 脚本原子操作 + bit 拼接。
>
> **追问点**：
> - Q: Redis 持久化怎么办？→ 答：AOF + 每日定时把 Redis 计数同步到 MySQL（凌晨 3 点低峰期），最多丢失一天数据
> - Q: Redis cluster 怎么分片？→ 答：按 `knowpost_id % 16384` 哈希到 4 master + 4 slave；Lua 脚本保证同 key 操作在同一节点
> - Q: 为什么不用 HyperLogLog？→ 答：HLL 是去重计数（UV），我们是累加（PV/点赞总数），需求不同

### Q11：联合索引最左前缀原则知道吗？举例子

**回答**：

> ```sql
> ALTER TABLE knowposts ADD INDEX idx_user_status_time (user_id, status, created_at);
> ```
>
> 有效索引命中场景（按最左前缀匹配）：
> - `WHERE user_id = 1` ✓
> - `WHERE user_id = 1 AND status = 'published'` ✓
> - `WHERE user_id = 1 AND status = 'published' AND created_at > '2026-01-01'` ✓
>
> 索引失效场景：
> - `WHERE status = 'published'` ✗（跳过 user_id）
> - `WHERE user_id = 1 AND created_at > '2026-01-01'` ✗（跳过 status）
> - `WHERE status = 'published' AND created_at > '2026-01-01'` ✗
>
> **追问点**：
> - Q: 范围查询之后的索引会失效？→ 答：对，`>` `<` `BETWEEN` 后面的列索引失效；但 `=` `IN` 不会
> - Q: 索引下推 ICP 知道吗？→ 答：MySQL 5.6+，在存储引擎层用索引过滤数据，减少回表

### Q12：分页查询很深（如 OFFSET 100000）怎么优化？

**回答**：

> 传统 `LIMIT 20 OFFSET 100000` 慢（扫 100020 行）。
>
> **两种优化**：
> 1. **子查询优化**（MySQL 5.7 不支持，5.7+ 默认支持）：
>    ```sql
>    SELECT * FROM knowposts 
>    WHERE id >= (SELECT id FROM knowposts WHERE user_id = 1 ORDER BY id DESC LIMIT 100000, 1)
>    ORDER BY id DESC LIMIT 20
>    ```
> 2. **业务层禁止深分页**：搜索引擎翻 100 页就停了，前端 disable "下一页"按钮
> 3. **search_after 深分页**（ES 方案）：传上一页最后一条的 `sortValues`，不用 from+size
>
> **追问点**：
> - Q: 为什么 ES 推荐 search_after 而不用 from+size？→ 答：from+size 浅分页（< 10000）还行，深分页 deep paging 需要每个 shard 都要算 from+size，coordinator 聚合，shard 数 × from 会爆；search_after 是 cursor-based，无此问题

### Q13：事务隔离级别用过哪些？项目里默认哪个？

**回答**：

> MySQL InnoDB 默认 **Repeatable Read（RR）**。
>
> 项目里用 `@Transactional(rollbackFor = Exception.class)` 显式声明回滚。
>
> 场景：
> - 点赞 + 计数：**本地事务**（一次 UPDATE）
> - 转账 + 计数：**分布式事务**（seata 或本地消息表）
> - 关注 + Feed 推送：本地事务 + **Kafka 异步**（关注成功 → 发 Kafka 消息 → Feed 服务消费）
>
> **追问点**：
> - Q: RR 有什么问题？→ 答：幻读（虽然 InnoDB 用 MVCC + Next-Key Lock 解决大部分）
> - Q: 你们用 Read Committed 吗？→ 答：没有，RR 够用；RC 在 binlog row 模式（statement 模式 RR 更安全）+ 主从一致性更好
> - Q: 什么是 MVCC？→ 答：每行加 `trx_id` + `roll_pointer`，SELECT 读 undo log 里的历史版本；RR 下同一个事务多次读看到同一快照

---

## 第四部分：缓存设计

### Q14：三级缓存怎么设计？一致性怎么保证？

**回答**：

> ```
> Browser CDN/SWR  →  L1 (Caffeine 进程内)  →  L2 (Redis 分布式)  →  L3 (MySQL)
> ```
>
> **每一层作用**：
> - **L1 (Caffeine)**：~100 MB 堆内缓存，TTL 5-30 分钟，热点 key 用 `expireAfterWrite`
> - **L2 (Redis)**：~10 GB 分布式缓存，TTL 30-60 分钟，多节点共享
> - **L3 (MySQL)**：权威源
>
> **一致性策略**（**Cache-Aside** 最常用）：
> 1. 读：先查 L1 → L2 → L3，回填
> 2. 写：**先写 L3，再失效 L1 + L2**（不是更新缓存）
> 3. **延迟双删**：写后 500ms 再删一次缓存（防读写并发导致脏数据）
>
> **追问点**：
> - Q: 为什么用 Cache-Aside 不用 Write-Through？→ 答：Write-Through 写性能差（每次写都同步写多级缓存），Cache-Aside 写完只删缓存，下次读时回填
> - Q: 缓存击穿怎么办？→ 答：Redis `SETNX` 分布式锁 + Caffeine `LoadingCache` 自动加载（**不**用互斥锁，会拖慢响应）
> - Q: 缓存雪崩？→ 答：TTL 加随机偏移（5±1 分钟），避免同时过期
> - Q: 你 hotkey 探测怎么做的？→ 答：Redis Stream + LFU 计数器，top-1% key 加长 TTL

### Q15：Redis 缓存的 key 怎么设计？namespace 怎么管？

**回答**：

> 我们的 key 设计：
> ```
> zhiyu:module:entity:field:id
>  ^      ^       ^      ^     ^
>  业务   模块   实体  字段  id
> ```
>
> 示例：
> - `zhiyu:user:profile:123` → 用户 123 的 profile
> - `zhiyu:post:counter:456:like` → 帖子 456 的点赞数
> - `zhiyu:feed:hot:user:123` → 用户 123 的热门 feed
> - `zhiyu:lock:sms:13800138000` → 短信发送分布式锁
>
> **namespace 管理**用 Redis keyspace notifications + 定期分析大 key
>
> **追问点**：
> - Q: 大 key 怎么办？→ 答：拆 hash 字段（按日期或 id mod 16），单个 hash < 1MB
> - Q: 热 key 怎么办？→ 答：Caffeine L1 + Redis 多副本读 + 客户端本地缓存
> - Q: 多 key 原子操作？→ 答：Lua 脚本（Redis 5+ 用 `EVAL` 替代 `EVALSHA`）

---

## 第五部分：消息队列 & 分布式

### Q16：Kafka 怎么保证消息不丢？你们的点赞用 Kafka 是为什么？

**回答**：

> Kafka 不丢消息三层保证：
> 1. **Producer 端**：`acks=all`（等所有 in-sync replica 写完）+ `enable.idempotence=true`（幂等防重复）+ `max.in.flight.requests.per.connection=1`
> 2. **Broker 端**：`replication.factor ≥ 3` + `min.insync.replicas ≥ 2`
> 3. **Consumer 端**：手动提交 offset（`enable.auto.commit=false` + `ack-mode=manual`）
>
> **点赞用 Kafka 的原因**（**不是直接 Redis 写**）：
> - 点赞是**高 QPS 写**（百万级 / 天）+ **需要异步落库**（不能直接写 MySQL 扛不住）
> - Kafka 削峰填谷 + 保证最终一致性
> - 流程：`点赞 → Redis INCR（实时返回）→ Kafka 异步消息 → Counter 服务消费 → MySQL 落库`
>
> **追问点**：
> - Q: 重复消息怎么办？→ 答：MySQL `UNIQUE(user_id, post_id, action)` + `INSERT IGNORE` 幂等
> - Q: Kafka 性能瓶颈在哪？→ 答：磁盘顺序写 + 零拷贝 sendfile，不在网络
> - Q: 怎么选 partition 数？→ 答：经验公式 = `max(吞吐量/单 partition 吞吐, 消费者并发数)`，我们 3-6 个 partition

### Q17：分布式锁怎么实现？Redis SETNX vs Redlock？

**回答**：

> 我们用 **Redis SETNX + Lua 释放**（Redlock 没用）。
>
> ```lua
> -- 获取锁（带 token 防误删）
> if redis.call('SET', KEYS[1], ARGV[1], 'NX', 'PX', ARGV[2]) then
>   return 1
> end
> return 0
> ```
>
> ```lua
> -- 释放锁（Lua 脚本保证原子）
> if redis.call('GET', KEYS[1]) == ARGV[1] then
>   return redis.call('DEL', KEYS[1])
> end
> return 0
> ```
>
> **关键点**：
> 1. **每个锁带 UUID token**——A 加的锁不会被 B 误删
> 2. **Lua 脚本保证检查+删除原子**——避免 `GET` 后过期被其他进程加锁再 `DEL` 错锁
> 3. **PX 设置毫秒 TTL**——避免死锁（应用崩溃后锁自动释放）
>
> **追问点**：
> - Q: Redlock 是什么？→ 答：Redis 作者 antirez 提的算法，在 N 个独立 Redis 集群加锁（多数成功才算获取）
> - Q: 为什么不用 Redlock？→ 答：Martin Kleppmann 反驳过 Redlock 时钟漂移问题（系统时间不同步）；我们单 Redis + Lua 已经够
> - Q: Zookeeper 分布式锁？→ 答：Zab 协议一致性更强，但性能差（10K QPS vs Redis 100K QPS），我们场景不需

### Q18：CAP 理论知道吗？你们的系统选 CA 还是 CP？

**回答**：

> **CAP**：一致性（Consistency）、可用性（Availability）、分区容忍（Partition tolerance）。分布式系统**只能三选二**。
>
> - **CA**：放弃 P（不允许分区）—— 单机数据库
> - **CP**：放弃 A—— ZooKeeper、etcd（分区时拒绝写）
> - **AP**：放弃 C—— Cassandra、DynamoDB（分区时继续服务，最终一致）
>
> **我们的选择**：
> - **认证服务**：CP（密码错误就拒绝，不能用陈旧数据）
> - **计数服务（点赞）**：AP（Redis 不可达时用本地缓存兜底，最终一致）
> - **AI 问答**：AP（向量库查不到时回退到全文检索，缓慢但可用）
> - **Feed 推送**：AP（Kafka 慢消费时返回稍旧 feed）

---

## 第六部分：搜索 & RAG（Agent 部分，30%）

### Q19：你的 RAG 召回率从 78% 怎么到 92%？做了哪些优化？

**回答**（**面试官最爱追问的硬核题**）：

> 我们的 92% 是 **Top-5 召回率**（ground truth 命中数 / 真实相关数）。
>
> **优化路径**：
>
> | 阶段 | Top-5 召回率 | RT | 关键优化 |
> |---|---|---|---|
> | V1 baseline | 78% | 4.8s | Embedding + 简单切块 |
> | V2 切块优化 | 85% | 3.2s | Markdown 按标题切 + 重叠 |
> | V3 重排序 | 89% | 2.8s | 加 bge-reranker-large |
> | V4 混合检索 | 92% | 1.5s | 向量 + 关键词 BM25 + RRF 融合 |
>
> **V2 切块优化**（最关键）：
> - 之前：固定 500 字符切块（破坏语义）
> - 现在：按 Markdown 标题切（H1/H2/H3），重叠 50 字符，块大小 200-800
> - 单篇有 5-10 个块，每块 200-800 token
>
> **V3 重排序**：
> - 第一阶段：双塔模型 bge-large-zh 召回 100 个候选
> - 第二阶段：bge-reranker-large 精排 → Top-5
> - **重排序模型交叉注意力**比双塔模型准 15%
>
> **V4 混合检索（最有效的优化）**：
> - 向量检索（语义） + BM25（关键词） → RRF (Reciprocal Rank Fusion) 融合
> - 公式：`score = 1/(60 + vector_rank) + 1/(60 + bm25_rank)`
> - 对专有名词、缩写（"RAG" "Spring AI"）特别有效
>
> **追问点**：
> - Q: 召回率怎么测的？→ 答：人工标注 200 个 query-answer 对（覆盖高频场景），用 NDCG@5 / Recall@5 / MRR 指标；定期回归测试
> - Q: 4.8s 到 1.5s 怎么优化的？→ 答：①Embedding 模型本地缓存 ②向量索引预热（启动时加载 1000 个热 chunk 进 Caffeine）③用 stream 流式响应（首 token 50ms 返回）④Top-K 限制（从 100 降到 50）
> - Q: 怎么评估 Embedding 模型效果？→ 答：MTEB 中文榜（C-MTEB），选 bge-large-zh-v1.5（中文 SOTA）

### Q20：RAG 和传统搜索有什么区别？为什么需要 RAG？

**回答**：

> - **传统搜索**：基于关键词 + BM25 排序（Lexical Search）
>   - 优点：精确匹配（API 文档、产品名）
>   - 缺点：**不理解语义**（搜"苹果"不知道是水果还是公司）
>
> - **RAG（Retrieval-Augmented Generation）**：
>   - 把用户问题 Embedding 向量化
>   - 在向量库找**语义相关**的 Top-K 文档
>   - 把文档 + 问题塞给 LLM，让 LLM **基于文档**回答
>   - 优点：能"理解"语义，能综合多文档，能给**有出处**的回答
>   - 缺点：成本高（每次都调 LLM）、延迟大
>
> **追问点**：
> - Q: Embedding 模型怎么选？→ 答：MTEB 中文榜前 3（如 bge-large-zh、m3e-large、text-embedding-3-small）
> - Q: 向量库为什么选 ES 不用 Milvus？→ 答：已有 ES 集群，节省运维成本；ES 8.x 向量检索 Recall@10 跟专用向量库差距 < 3%
> - Q: 不用 fine-tuning？→ 答：成本高（数据准备 + 训练资源），且用户问题分布变化快（每周都有新梗），RAG 灵活

### Q21：怎么解决大模型幻觉（hallucination）问题？

**回答**：

> 我们的 4 层防护：
>
> 1. **Prompt 约束**：
>    ```
>    你是一个知识问答助手。请严格基于以下"参考资料"回答用户问题。
>    - 如果参考资料里有答案：直接引用并标注出处 [1][2]
>    - 如果参考资料里没有答案：明确说"抱歉，这个问题在知识库里没有找到"
>    - 禁止编造信息
>    参考资料：
>    [1] xxx
>    [2] xxx
>    ```
> 2. **RAG 兜底**：检索到 0 个相关文档时，**直接返回"无答案"**，不调 LLM
> 3. **回答溯源**：每个回答附 [1][2] 引用编号，用户可点跳转原文
> 4. **用户反馈**：点赞/点踩/举报，模型 badcase 收集到微调数据集
>
> **追问点**：
> - Q: RAG 不够怎么办？→ 答：上 Agent + 工具调用（Function Calling），让 LLM 调数据库/搜索引擎/API
> - Q: 微调 vs RAG？→ 答：领域知识用 RAG（实时更新），风格/格式用 fine-tuning（一次训练）
> - Q: temperature 怎么设？→ 答：知识问答 0.1-0.3（精确），创意生成 0.7-0.9（多样）

### Q22：Streaming 输出（SSE）怎么实现？前端怎么处理？

**回答**：

> **后端**（Spring Boot 3 + Spring WebFlux）：
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
> es.onmessage = (e) => {
>   content += e.data;  // 每个 chunk 累加
>   render();
> };
> es.onerror = () => es.close();
> ```
>
> **SSE 协议**：`data: {chunk}\n\n`（每行 `data:` 前缀 + 双换行结束）
>
> **追问点**：
> - Q: SSE vs WebSocket？→ 答：SSE 是单向（server → client），WebSocket 双向；问答场景单向 SSE 够用，且 SSE 自动重连、HTTP 友好
> - Q: 为什么不用 chunked transfer？→ 答：SSE 是 chunked 的标准化（带 `event:` `id:` `data:` 字段），浏览器 EventSource API 帮你解析
> - Q: Spring 的 SSE 异常？→ 答：`@ExceptionHandler` 默认返回 JSON，但 EventSource 期望 `text/event-stream` → 需根据 Accept 头分流（我刚刚修复过这个 bug）

### Q23：Spring AI 怎么和 Spring Boot 集成？用过哪些 Spring AI 模块？

**回答**：

> **用过**：
> - `spring-ai-starter-model-openai`（DeepSeek 是 OpenAI 协议兼容）
> - `spring-ai-starter-vector-store-elasticsearch`
> - `spring-ai-model-deepseek`（DeepSeek chat）
>
> **核心抽象**：
> - **`ChatClient`**：高层 API，链式调用
>   ```java
>   chatClient.prompt()
>     .system(systemPrompt)
>     .user(userMsg)
>     .stream()        // 流式响应
>     .content();      // 阻塞响应
>   ```
> - **`EmbeddingModel`**：文本 → 向量
> - **`VectorStore`**：统一的向量 CRUD 接口
>
> **Spring AI 内部用了哪些设计模式？**
> - `ChatModel` 接口 + `DeepSeekChatModel` / `OpenAiChatModel` 多实现（Strategy 模式）
> - `MessageConverter` 处理不同协议
> - `ObservationRegistry` Micrometer 埋点（性能监控）
>
> **追问点**：
> - Q: 怎么换 LLM？→ 答：改 application.yml 的 `spring.ai.openai.base-url` + `api-key` 即可
> - Q: Function Calling 用过吗？→ 答：用过，给 ChatClient 配 `@Tool` 注解的方法，LLM 自动判断调哪个工具

### Q24：Agent 和 RAG 区别？你的项目里有 Agent 吗？

**回答**：

> - **RAG**：**检索** + **生成**——LLM 基于检索到的文档回答
> - **Agent**：LLM 自己**思考**该做什么 → 调工具 / 查数据库 / 调 API → 多轮决策
>
> 项目里有 **简化版 Agent**（在 AI 问答 Controller 里）：
> - LLM 根据用户问题，**自动判断**调哪个工具：
>   - 调"知文搜索"工具（向量检索）
>   - 调"用户搜索"工具
>   - 调"按时间排序"工具
> - 工具执行结果再喂给 LLM 综合回答
>
> **实现**：
> ```java
> List< ToolCallback > tools = List.of(
>   ToolCallback.builder().name("searchPost").description("搜索知文").callHandler(...)
> );
> chatClient.prompt()
>   .tools(tools)
>   .user(question)
>   .stream().content();
> ```
>
> **追问点**：
> - Q: Agent 的 ReAct 知道吗？→ 答：Reason + Act 循环：LLM 思考 → 调工具 → 观察结果 → 再思考 → 直到答案。Spring AI 1.0+ 内置 Agent 模块
> - Q: 多 Agent 协作？→ 答：可以，主 Agent + 子 Agent 编排（LangGraph / Spring AI Graph），但复杂度高，我们项目用不上

### Q25：LLM 怎么控制输出格式（JSON / 结构化）？

**回答**：

> 三种方法：
>
> 1. **Prompt 指令**（最简单，不稳定）：
>    ```
>    请以 JSON 格式输出，格式：{"summary": "...", "tags": [...]}
>    ```
> 2. **Function Calling**（最稳）：
>    ```java
>     ToolCallback.builder()
>       .name("extract_tags")
>       .inputType(TagsRequest.class)  // Spring 自动转 JSON schema
>       .callHandler(...)
>    ```
>    LLM 自动按 schema 返回结构化数据
> 3. **OutputParser**（Spring AI 提供）：
>    ```java
>     .contentType(MediaType.APPLICATION_JSON)
>     .call(new BeanOutputConverter<>(PostSummary.class))
>    ```
>
> **追问点**：
> - Q: LLM 输出的 JSON 偶尔格式错误怎么办？→ 答：加 retry + 严格 prompt 约束 + 验证 try-catch
> - Q: Function Calling vs JSON Mode？→ 答：JSON Mode 只能控制输出格式，Function Calling 还能让 LLM 决定调不调工具

---

## 第七部分：性能 & 监控

### Q26：首问 4.8s 到 1.5s 怎么优化的？

**回答**（**必问的硬数据题**）：

> | 优化点 | 节省 | 怎么做的 |
> |---|---|---|
> | Embedding 模型本地缓存 | -800ms | 启动时 bge-large-zh 加载到 Caffeine，**避免每次请求都加载** |
> | 向量索引预热 | -600ms | 启动时扫 1000 个热 chunk 进 Caffeine |
> | 流式响应 | -1500ms | 首 token 50ms 返回（之前要等 LLM 全部生成） |
> | Top-K 优化 | -200ms | 从 100 → 50（少算 50 个 similarity） |
> | 关键词短路 | -200ms | 高频词（"RAG"、"Spring"）直接用 BM25，跳过向量 |
>
> **追问点**：
> - Q: Embedding 加载要多久？→ 答：bge-large-zh 首次加载 ~3 秒（336MB 模型 + ONNX Runtime）
> - Q: 怎么测的？→ 答：JFR + async-profiler，看热点方法。JMeter 100 并发压测
> - Q: 4.8s 是 P50 还是 P99？→ 答：P95（95% 请求）

### Q27：你们的系统 QPS 多少？怎么测的？

**回答**：

> - 认证：~500 QPS（瓶颈是 SMS 第三方）
> - Feed 流：~5000 QPS（Caffeine L1 命中 80%）
> - 点赞/计数：~3 万 QPS（Redis pipeline）
> - AI 问答：~50 QPS（瓶颈是 LLM API + 召回）
> - 搜索：~1000 QPS（ES 集群）
>
> 压测工具：**JMeter**（业务压测）+ **wrk**（HTTP 极限）+ **redis-benchmark**（Redis）。
>
> **追问点**：
> - Q: 怎么找瓶颈？→ 答：分布式追踪（SkyWalking）+ 日志关联（traceId）
> - Q: CPU/内存/网络/磁盘 哪个是瓶颈？→ 答：看具体场景——计算密集（AI 推理）CPU 瓶颈；缓存/DB IO 密集是网络/磁盘

### Q28：线上 OOM / 内存泄漏怎么排查？

**回答**：

> 1. **dump 内存**：jmap 或 `-XX:+HeapDumpOnOutOfMemoryError` 自动 dump
> 2. **分析工具**：MAT（Eclipse Memory Analyzer）、VisualVM、JProfiler
> 3. **看 Retained Heap** 找大对象
>
> 我项目里见过的案例：
> - **Caffeine 缓存没设最大容量** → OOM（用 `maximumSize=100_000` 限制）
> - **MyBatis 一级缓存**（`localCacheScope=SESSION`）→ 长时间事务的会话累积 → 改 `STATEMENT`
> - **Lambda 闭包引用大对象** → 内存泄漏（避免在长生命周期线程里捕获大对象）
> - **线程池队列无界** → OOM（必须 `new ArrayBlockingQueue<>(1000)` 有界队列）
>
> **追问点**：
> - Q: 怎么定位是哪段代码？→ 答：MAT 的 Leak Suspects → 看 GC root 链
> - Q: 预防措施？→ 答：① 定期 jmap 快照对比 ② APM 监控内存增长曲线 ③ 代码 review（禁止静态集合装大对象）

---

## 第八部分：架构设计

### Q29：为什么选 Spring Boot 3 + Java 21？

**回答**：

> - **Java 21 LTS**（长期支持到 2031）
> - **虚拟线程（Virtual Threads）**：高并发 I/O 密集场景（HTTP 调用、DB 查询）性能提升 5-10 倍，无需改业务代码（spring.threads.virtual.enabled=true）
> - **Pattern Matching for instanceof**：代码更简洁
> - **Records**：减少 POJO 样板代码
> - **Spring Boot 3**：Jakarta EE 9（javax → jakarta 命名空间）
> - **Spring AI 1.0**：原生 LLM 集成（之前要自己写 OpenAI client）
>
> **追问点**：
> - Q: 虚拟线程对比 WebFlux？→ 答：虚拟线程同步写法但性能异步，团队学习成本低；WebFlux 写响应式门槛高
> - Q: 为什么不选 Go？→ 答：Spring AI / Spring Security / Spring Data 全套生态 Go 还没替代品；招聘难度 Go 比 Java 难

### Q30：你们的架构怎么演进？单体还是微服务？

**回答**：

> **当前是模块化单体**（按 feature 拆包，不是按微服务拆）：
> ```
> com.comioko.auth        # 认证
> com.comioko.knowpost     # 知文
> com.comioko.llm          # AI
> com.comioko.search       # 搜索
> com.comioko.counter      # 计数
> com.comioko.user         # 用户
> com.comioko.relation     # 关注
> ```
>
> 单体优势：
> - 部署简单（1 个 jar）
> - 事务跨模块方便（点赞 + 计数一事务）
> - IDE 重构快
>
> **未来微服务拆分计划**（按业务边界）：
> - `auth-service`（独立部署，公网入口）
> - `content-service`（核心，独立扩展）
> - `ai-service`（GPU 资源独立，OpenAI 限速隔离）
> - `counter-service`（Redis 写密集，独立扩）
>
> **追问点**：
> - Q: 怎么拆？→ 答：绞杀者模式（Strangler Fig Pattern）——新功能用微服务，旧功能保留在单体，逐步迁移
> - Q: 分布式事务怎么办？→ 答：本地消息表 + 最终一致性（不用 seata 2PC）

---

## 第九部分：项目深挖（自由提问）

### Q31：项目里遇到的最大技术难点是什么？怎么解决的？

**回答**（**面试官 100% 追问**）：

> 三个难点：
>
> 1. **AI 问答的首问延迟 4.8 秒**——已经在 Q19 / Q26 详述
> 2. **点赞计数器的高并发写入**：单 Redis 写 5 万 QPS，但 RTT 2ms 累积延迟
>    - 方案：Redis Pipeline 批量提交 + Lua 脚本原子 INCR + 异步 Kafka 落库
> 3. **RAG 召回不准**（Top-5 召回率 78% → 92%）：已经在 Q19 详述
>
> **最近一次**（在简历时间段内）：**ES search_after 深分页**——传统 `from+size` 在 1 万条后性能雪崩，shard 数 × from 累计放大
>
> **追问点**（可任意挑一个深挖）：
> - Q: Pipeline 批大小怎么定？→ 答：100-500 之间，超过 1000 单 Pipeline 命令太长反而变慢
> - Q: 异步落库丢失怎么办？→ 答：MySQL 写失败进 dead-letter 表，定时重试 3 次

### Q32：RAG 系统的 prompt 怎么设计的？给个例子

**回答**：

```java
private static final String SYSTEM_PROMPT = """
你是一个知识问答助手。请严格基于以下"参考资料"回答用户问题。
要求：
1. 答案必须基于参考资料，禁止编造信息
2. 回答格式：
   - 简短答案（1-2 句话）
   - 详细说明（如果有）
   - 参考资料（用 [1][2] 标注来源）
3. 如果参考资料里没有答案，回答：
   "抱歉，这个问题在知识库里没有找到。你可以换个问法，或去创作一篇知文。"
4. 严格使用用户提问的语言（中文/英文）

参考资料：
%s

用户问题：%s
""";
```

**追问点**：
- Q: 怎么避免 prompt 注入？→ 答：① system prompt 优先级最高 ② 用户输入转义 ③ 输出用 JSON schema 验证
- Q: token 超限怎么办？→ 答：① prompt 截断（只取 Top-5 文档，超长截断）② 摘要后塞 prompt

### Q33：你的 ES 向量索引怎么设计？维度多少？

**回答**：

> ```json
> {
>   "mappings": {
>     "properties": {
>       "post_id": { "type": "long" },
>       "chunk_id": { "type": "keyword" },
>       "content": { "type": "text", "analyzer": "ik_smart" },  // 中文 IK 分词
>       "content_vector": {
>         "type": "dense_vector",
>         "dims": 1024,        // bge-large-zh-v1.5 输出维度
>         "index": true,
>         "similarity": "cosine"
>       },
>       "title": { "type": "text" },
>       "tags": { "type": "keyword" },
>       "created_at": { "type": "date" }
>     }
>   }
> }
> ```
>
> 选 **1024 维** 的原因：
> - bge-large-zh-v1.5 是 1024 维（中文 SOTA）
> - 维度越高越准，但**存储 × 4 倍**（float32），我们 100 万 chunk × 1024 × 4 = 4GB 内存
> - **768 维**（OpenAI text-embedding-3-small）也可以，但中文效果不如 bge
>
> **追问点**：
> - Q: cosine 还是 dot_product？→ 答：cosine（标准做法，对向量长度不敏感）
> - Q: 索引预热怎么做？→ 答：ES `_refresh` + `forcemerge` 段合并 + 把热查询进 query cache

### Q34：Spring AI 1.0 和 LangChain4j 怎么选？

**回答**：

> | 维度 | Spring AI | LangChain4j |
> |---|---|---|
> | 集成 | Spring Boot 原生，注解驱动 | 独立框架 |
> | Vector Store | 内置 10+ 种 | 20+ 种 |
> | Function Calling | Spring 风格（@Tool） | 通用 |
> | 性能 | 中 | 中 |
> | 学习曲线 | 低（Spring 开发者） | 中（Python 风格） |
> | 社区 | 快速增长 | 成熟 |
>
> **选 Spring AI**：
> 1. 项目 Spring 全家桶
> 2. Function Calling 注解式（@Tool）开发快
> 3. Java 生态独占
>
> **追问点**：
> - Q: 为什么不直接用 Python LangChain？→ 答：项目后端是 Java，没必要为 AI 单切 Python 微服务

### Q35：AI 总结的 summary 怎么评估质量？

**回答**：

> 我们有**两个评估维度**：
> 1. **业务指标**：点赞率、阅读完成率（带 summary 的 vs 不带的 A/B 测试）
> 2. **质量指标**：人工标注 200 篇，人工评估（1-5 分）+ 自动评估（BLEU/ROUGE）
>
> **追问点**：
> - Q: 自动评估靠谱吗？→ 答：BLEU/ROUGE 对中文生成不友好（分词差异大），我们用 LLM-as-Judge（让 GPT-4 给 1-5 分）
> - Q: 数据怎么收集？→ 答：用户对 summary 反馈（点赞/编辑）+ 人工标注

---

## 第十部分：行为面试（软技能）

### Q36：为什么独立开发而不是去大厂？

**回答**：

> 1. 想要**全栈**经验——大厂分工细，独立开发能接触前后端 + 部署 + 运维
> 2. **学习深度**——独立项目要为自己每个决策负责，成长快
> 3. 想做**有用户使用**的产品，而不是大厂内部系统
> 4. 时间灵活（在准备面试的同时也在维护这个项目）

### Q37：你最大的优点 / 缺点是什么？

**回答**：

> **优点**：
> - **数据驱动**——不拍脑袋，每个优化都有数据支撑（Q19 / Q26 都有具体数字）
> - **可观测性**——每个服务都有日志、指标、链路追踪，问题能快速定位
>
> **缺点**：
> - **完美主义倾向**——花太多时间打磨细节（早期 over-engineer），现在学会 MVP 优先
> - **技术更新焦虑**——AI 领域每周都有新东西，要保持平衡

### Q38：你对未来的规划？

**回答**：

> 短期（3 个月）：拿到一份好工作，继续深耕 Java 后端 + RAG 方向
> 中期（1-2 年）：成为团队里 AI + 后端的桥梁，能独立设计 RAG/Agent 系统
> 长期：能 lead 一个 AI-native 产品

---

## 加分项（自由发挥）

### 你有什么想问我的？

**反问技巧**：

> 1. "团队现在 AI 应用的成熟度怎么样？是用 RAG 还是有更高级的 Agent 框架？"
> 2. "后端技术栈是 Java 还是 Go？Spring 全家桶还是 Dubbo？"
> 3. "这个岗位的核心痛点是什么？是性能优化、新功能上线、还是稳定性？"
> 4. "团队规模多大？我入职后会负责哪个模块？"
> 5. "公司对 AI 工程师的期望是落地业务，还是研究新算法？"

**避免问**：
- ❌ "薪资多少？"（HR 面再问）
- ❌ "加班多吗？"（负面）
- ❌ "我面的什么级别？"（HR 会主动说）

---

## 面试前一晚准备清单

- [ ] 复习 5 个核心数据（92%、1.5s、节省 30%、0.3s、4.8s）的**计算方式**
- [ ] 准备好 RAG demo（如果有的话）
- [ ] GitHub 仓库确保能 clone + 能跑起来
- [ ] 项目 README 写清楚架构图
- [ ] 复习 Spring Boot Bean 生命周期（高频题）
- [ ] 复习数据库索引（联合索引最左前缀）
- [ ] 复习 Kafka 不丢消息（acks + 幂等 + 副本）
- [ ] 复习 Redis 分布式锁（SETNX + Lua）
- [ ] 准备好 3 个反问问题
- [ ] 准备好 STAR 法则讲 2-3 个项目难点故事

---

> 文档生成时间：2026-07
> 适配岗位：后端开发（70%）+ Agent 开发（30%）
> 文档基于项目实际技术栈（Spring Boot 3 + Spring AI + MySQL + Redis + Kafka + ES）
