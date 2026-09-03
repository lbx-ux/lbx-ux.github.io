---
title: 3.总结
description: RabbitMQ&SpringAMQP学习总结
pubDate: 2026-08-17
series: RabbitMQ
order: 3
source: Java后端/MQ/RabbitMQ/3.总结.md
---

# RabbitMQ & SpringAMQP 学习总结

---

## 一、为什么要用 MQ——同步调用的三大问题

同步调用（如 OpenFeign）存在三个致命缺陷：

1. **扩展性差**——新增业务（如发短信、加积分）需改动调用方代码，违反开闭原则
2. **性能下降**——调用方阻塞等待，总耗时等于所有远程调用耗时之和
3. **级联失败**——下游服务故障会导致整个事务回滚

异步调用通过消息 Broker 解耦发送者和接收者，解决了上述问题：耦合度低、性能好、扩展性强、故障隔离。

---

## 二、RabbitMQ 核心概念

| 概念 | 定义 | 关键理解 |
|------|------|----------|
| **Publisher** | 消息生产者，发送消息的一方 | 不直接发队列，而是发给交换机 |
| **Consumer** | 消息消费者，处理消息的一方 | 通过监听队列来接收消息 |
| **Exchange** | 交换机，负责路由消息 | **只转发，不存储**——没有任何队列绑定或路由不匹配时，消息直接丢失 |
| **Queue** | 队列，存储消息 | 消息的真正存放地，等待消费者处理 |
| **Virtual Host** | 虚拟主机，数据隔离 | 每个 vhost 有独立的交换机、队列，多项目共用一套 MQ 时的隔离方案 |

**架构流转：** Publisher → Exchange（路由）→ Queue（存储）→ Consumer

---

## 三、SpringAMQP 三大核心利器

SpringAMQP 之于 RabbitMQ，如同 MyBatis 之于 JDBC，是对底层 Java Client 的封装简化。

### 3.1 RabbitTemplate —— 消息发送

```java
// 一行代码发送消息，底层自动处理连接、序列化
rabbitTemplate.convertAndSend("交换机名", "路由键", "消息内容");
```

### 3.2 @RabbitListener —— 消息接收

```java
// 声明式监听，消息到达时自动触发方法
@RabbitListener(queues = "队列名")
public void receiveMessage(String msg) {
    // 处理消息
}
```

### 3.3 AmqpAdmin —— 自动声明

程序启动时自动在 RabbitMQ 中创建交换机、队列和绑定关系，无需手动在控制台操作。

---

## 四、四种交换机类型

| 类型 | 路由规则 | 通配符 | 典型场景 |
|------|----------|--------|----------|
| **Direct** | Routing Key 精确匹配 Binding Key | 无 | 点对点定向分发 |
| **Fanout** | 忽略 Routing Key，广播到所有绑定队列 | 无 | 配置更新通知、全局广播 |
| **Topic** | Routing Key 按单词（`.`分隔）模糊匹配 | `*` 匹配一个词，`#` 匹配零或多个词 | 按业务模块灵活订阅 |
| **Headers** | 匹配消息 Headers 属性，非 Routing Key | 无 | 复杂属性组合路由（少用） |

### Direct Exchange 代码方向

```java
@Configuration
public class DirectConfig {
    @Bean public DirectExchange directExchange() { return new DirectExchange("my.direct.exchange"); }
    @Bean public Queue directQueue() { return new Queue("my.direct.queue"); }
    @Bean public Binding binding() {
        return BindingBuilder.bind(directQueue()).to(directExchange()).with("info.routing.key");
    }
}
// 发送：rabbitTemplate.convertAndSend("my.direct.exchange", "info.routing.key", msg);
```

### Fanout Exchange 代码方向

```java
// 声明 FanoutExchange，队列绑定时不指定 RoutingKey
@Bean public FanoutExchange fanoutExchange() { return new FanoutExchange("my.fanout.exchange"); }
// 发送时 RoutingKey 留空：rabbitTemplate.convertAndSend("my.fanout.exchange", "", msg);
```

### Topic Exchange 代码方向

```java
// 绑定示例：key = "log.error.*" 匹配 log.error.db，不匹配 log.error.db.mysql
//           key = "log.#" 匹配所有 log. 开头的消息
@Bean public TopicExchange topicExchange() { return new TopicExchange("my.topic.exchange"); }
@Bean public Binding binding() {
    return BindingBuilder.bind(queue()).to(topicExchange()).with("order.#");
}
```

### 注解方式声明（推荐）

```java
@RabbitListener(bindings = @QueueBinding(
    value = @Queue(name = "队列名", durable = "true"),
    exchange = @Exchange(name = "交换机名", type = ExchangeTypes.TOPIC),
    key = "order.#"
))
public void listen(String msg) { /* 处理逻辑 */ }
```

三种类型的区别：
- **Direct**：需要指定 `key`，精确匹配
- **Fanout**：**省略 `key`**，广播到所有绑定队列
- **Topic**：`key` 可以使用 `#` 和 `*` 通配符

---

## 五、WorkQueues 模型

多个消费者绑定同一个队列，**同一条消息只会被一个消费者处理**。

核心配置——能者多劳：

```yaml
spring:
  rabbitmq:
    listener:
      simple:
        prefetch: 1   # 每次只取一条，处理完才能取下一��
```

不配 `prefetch: 1` 时，消息会平均分配（不管消费者处理能力）；配置后按实际处理速度分配，快的多消费，慢的少消费。

---

## 六、消息可靠性——三道防线

消息丢失可能发生在三个阶段，需要逐一保障。

### 6.1 发送者可靠性

**生产者重试机制**（网络抖动时用）：

```yaml
spring:
  rabbitmq:
    connection-timeout: 1s
    template:
      retry:
        enabled: true
        initial-interval: 1000ms
        max-attempts: 3
```

注意：这是**阻塞式**重试，会卡住当前线程，高吞吐场景慎用。

**生产者确认机制**——必经两个节点：

```
Producer  →  Exchange  →  Queue
   └── Confirm ──┘  └── Return ──┘
```

- **Publisher Confirm**：确认消息是否到达 Exchange（ack / nack）
- **Publisher Return**：确认消息是否从 Exchange 路由到 Queue（路由失败时退回消息）

配置开启：

```yaml
spring:
  rabbitmq:
    publisher-confirm-type: correlated   # 异步回调模式（推荐）
    publisher-returns: true
```

全局 Return 回调：

```java
@Configuration
public class RabbitCommonConfig implements ApplicationContextAware {
    @Override
    public void setApplicationContext(ApplicationContext ctx) {
        RabbitTemplate rt = ctx.getBean(RabbitTemplate.class);
        rt.setReturnsCallback(returned -> {
            log.error("路由失败: exchange={}, routingKey={}", returned.getExchange(), returned.getRoutingKey());
            // TODO: 补偿逻辑
        });
    }
}
```

局部 Confirm 回调（用于核心业务）：

```java
CorrelationData cd = new CorrelationData();
cd.getFuture().addCallback(new ListenableFutureCallback<>() {
    public void onSuccess(Confirm result) {
        if (result.isAck()) { /* 成功 */ } else { /* nack，记录失败 */ }
    }
    public void onFailure(Throwable ex) { /* Spring 内部异常，极少触发 */ }
});
rabbitTemplate.convertAndSend("exchange", "routingKey", msg, cd);
```

**实践建议：** 全局 Return 回调兜底所有路由错误；核心金融消息用局部 Confirm 回调；普通通知类消息不开启确认以获得更高吞吐。

### 6.2 MQ 自身可靠性

**持久化铁三角（缺一不可）：**

| 持久化对象 | 代码方向 |
|------------|----------|
| 交换机持久化 | `new DirectExchange("name", true, false)` |
| 队列持久化 | `new Queue("name", true)` 或 `QueueBuilder.durable("name").build()` |
| 消息持久化 | Spring Boot 默认已设置 `DeliveryMode = 2`，无需额外处理 |

**Lazy Queue（惰性队列）：** 消息直接写磁盘，内存只保留最近 2048 条。用 I/O 延迟换取海量堆积能力。3.12 版本后已成为默认模式。

```java
// @Bean 方式
QueueBuilder.durable("lazy.queue").lazy().build();

// 注解方式
@RabbitListener(queuesToDeclare = @Queue(
    name = "lazy.queue", durable = "true",
    arguments = @Argument(name = "x-queue-mode", value = "lazy")
))
```

### 6.3 消费者可靠性

**消费者确认机制（三种模式）：**

| 模式 | 行为 | 建议 |
|------|------|------|
| `none` | 投递后立即 ack，消息从队列删除 | 绝对不用 |
| `manual` | 手动调用 api 发 ack/reject | 灵活但有侵入 |
| `auto` | Spring AOP 环绕增强，正常→ack，业务异常→nack，校验异常→reject | **推荐** |

```yaml
spring:
  rabbitmq:
    listener:
      simple:
        acknowledge-mode: auto
```

**消费者失败重试（本地重试，不 requeue）：**

```yaml
spring:
  rabbitmq:
    listener:
      simple:
        retry:
          enabled: true
          initial-interval: 1000ms
          multiplier: 1
          max-attempts: 3
```

重试耗尽后的处理策略——**RepublishMessageRecoverer（推荐）**：

```java
@Configuration
public class ErrorMessageConfig {
    // 声明 error.exchange、error.queue、绑定
    @Bean
    public MessageRecoverer recoverer(RabbitTemplate rt) {
        return new RepublishMessageRecoverer(rt, "error.exchange", "error.routing.key");
    }
}
```

完整流程：消息到达 → 处理失败抛异常 → 本地重试 3 次 → 仍失败 → 投递到 error.queue → 原队列 ack 删除 → 人工处理。

**绝对原则：消费者遇到错误必须抛出异常**，不能 try-catch 吞掉，否则 Spring 无法感知失败触发重试。

---

## 七、消息幂等性

重复消费的根本原因：网络超时导致生产者重发、MQ 重投等。解决方案有三种：

| 方案 | 做法 | 特点 |
|------|------|------|
| **数据库唯一索引** | 消息消费记录表 `message_id` 设唯一键，插入冲突即重复 | 100% 可靠，最推荐 |
| **Redis 分布式锁** | `SETNX messageId`，设置失败说明已处理 | 高性能屏障，挡并发 |
| **状态机/乐观锁** | `UPDATE order SET status=2 WHERE status=1`，状态已变则更新行数为 0 | 不额外建表，结合业务 |

**企业标准流程：** Redis 挡并发 → MySQL 兜底 → 状态机校验 → 执行核心业务 → 异常时删 Redis key 让重试接管。

---

## 八、延迟消息

**场景：** 下单 30 分钟后未支付自动取消订单。

### 方案一：死信交换机 + TTL

消息设置 TTL 超时 → 成为死信 → 投递到死信交换机 → 进入死信队列被消费。

**注意：** TTL 是追溯式过期，消息只有到队首时才判断是否过期。队列堆积严重时延迟不准。

### 方案二：DelayExchange 插件（推荐）

安装插件后新增 `x-delayed-message` 交换机类型，精确控制延迟。

```java
// 声明延迟交换机
@Bean
public DirectExchange delayExchange() {
    return ExchangeBuilder.directExchange("delay.direct").delayed().durable(true).build();
}

// 发送延迟消息
rabbitTemplate.convertAndSend("delay.direct", "delay", msg, m -> {
    m.getMessageProperties().setDelay(5000);  // 延迟 5 秒
    return m;
});
```

---

## 九、关键代码模式总览

```
┌────────────────────────────────────────────────────────────┐
│                     消息发送端                              │
│                                                            │
│  RabbitTemplate.convertAndSend(exchange, routingKey, msg)  │
│  + ConnectionTimeout + Retry（网络抖动）                    │
│  + Publisher Confirm（核心消息逐条确认）                    │
│  + Publisher Return（全局路由兜底）                        │
│  + Jackson2JsonMessageConverter（JSON 序列化）              │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                      RabbitMQ 服务端                        │
│                                                            │
│  Exchange（路由）+ Queue（存储）+ Binding（绑定）           │
│  + 持久化铁三角（交换机/队列/消息）                         │
│  + Lazy Queue（防堆积）                                    │
└────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌────────────────────────────────────────────────────────────┐
│                     消息消费端                              │
│                                                            │
│  @RabbitListener + @QueueBinding（注解声明）               │
│  + prefetch: 1（能者多劳）                                 │
│  + acknowledge-mode: auto（自动确认）                      │
│  + Local Retry（本地重试，不 requeue）                     │
│  + RepublishMessageRecoverer（失败转死信队列）             │
│  + 幂等处理（DB 唯一键 + Redis 锁 + 状态机）               │
└────────────────────────────────────────────────────────────┘
```
