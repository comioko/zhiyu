package com.comioko.config;

import org.redisson.Redisson;
import org.redisson.api.RedissonClient;
import org.redisson.config.Config;
import org.redisson.config.SingleServerConfig;
import org.springframework.boot.autoconfigure.data.redis.RedisProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;

@Configuration
public class RedissonConfig {
    @Value("${counter.rebuild.lock.watchdog-ms:30000}")
    private long lockWatchdogMs;

    @Value("${redisson.threads:16}")
    private int threads;
    @Value("${redisson.netty-threads:32}")
    private int nettyThreads;
    @Value("${redisson.connection-pool-size:64}")
    private int connectionPoolSize;
    @Value("${redisson.connection-minimum-idle-size:24}")
    private int connectionMinimumIdleSize;
    @Value("${redisson.subscription-connection-pool-size:50}")
    private int subscriptionConnectionPoolSize;
    @Value("${redisson.subscription-connection-minimum-idle-size:1}")
    private int subscriptionConnectionMinimumIdleSize;

    @Bean
    public RedissonClient redissonClient(RedisProperties redisProperties) {
        Config config = new Config();
        config.setThreads(threads);
        config.setNettyThreads(nettyThreads);
        // 配置 Redisson 的锁看门狗超时，用于自动续约锁
        config.setLockWatchdogTimeout(lockWatchdogMs);
        String address = "redis://" + redisProperties.getHost() + ":" + redisProperties.getPort();
        SingleServerConfig single = config.useSingleServer().setAddress(address);
        single.setConnectionPoolSize(connectionPoolSize);
        single.setConnectionMinimumIdleSize(connectionMinimumIdleSize);
        single.setSubscriptionConnectionPoolSize(subscriptionConnectionPoolSize);
        single.setSubscriptionConnectionMinimumIdleSize(subscriptionConnectionMinimumIdleSize);

        if (redisProperties.getPassword() != null && !redisProperties.getPassword().isEmpty()) {
            single.setPassword(redisProperties.getPassword());
        }

        // Spring Boot RedisProperties#getDatabase 返回的是原始 int（默认 0），无需判空
        single.setDatabase(redisProperties.getDatabase());
        return Redisson.create(config);
    }
}
