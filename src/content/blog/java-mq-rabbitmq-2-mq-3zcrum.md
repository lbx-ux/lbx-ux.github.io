---
title: 2.RabbitMQ高级
description: RabbitMQ 消息可靠性全链路方案：生产者确认与重试、MQ 持久化与惰性队列、消费者确认与业务幂等，并用死信交换机实现延迟消息。
pubDate: 2026-08-17
series: RabbitMQ
order: 2
sort: 49
source: Java后端/MQ/RabbitMQ/2.MQ高级.md
---

# 1. 发送者的可靠性
首先，我们一起分析一下消息丢失的可能性有哪些。
消息从发送者发送消息，到消费者处理消息，需要经过的流程是这样的：
![](/covers/java-mq-rabbitmq-2-mq-3zcrum/1687334552247-cab38ab5-ae63-4f06-9ece-e9f244e3c170-1786090800645-5.jpeg)
消息从生产者到消费者的每一步都可能导致消息丢失：

- 发送消息时丢失：
   - 生产者发送消息时连接MQ失败
   - 生产者发送消息到达MQ后未找到`Exchange`
   - 生产者发送消息到达MQ的`Exchange`后，未找到合适的`Queue`
   - 消息到达MQ后，处理消息的进程发生异常
- MQ导致消息丢失：
   - 消息到达MQ，保存到队列后，尚未消费就突然宕机
- 消费者处理消息时：
   - 消息接收后尚未处理突然宕机
   - 消息接收后处理过程中抛出异常

综上，我们要解决消息丢失问题，保证MQ的可靠性，就必须从3个方面入手：

- 确保生产者一定把消息发送到MQ
- 确保MQ不会将消息弄丢
- 确保消费者一定要处理消息

这一章我们先来看如何确保生产者一定能把消息发送到MQ。



## 1. 生产者重试机制

首先第一种情况，就是生产者发送消息时，出现了网络故障，导致与MQ的连接中断。

为了解决这个问题，SpringAMQP提供的消息发送时的重试机制。即：当`RabbitTemplate`与MQ连接超时后，多次重试。

修改`publisher`模块的`application.yaml`文件，添加下面的内容：
```yaml
spring:
  rabbitmq:
    connection-timeout: 1s # 设置MQ的连接超时时间
    template:
      retry:
        enabled: true # 开启超时重试机制
        initial-interval: 1000ms # 失败后的初始等待时间
        multiplier: 1 # 失败后下次的等待时长倍数，下次等待时长 = initial-interval * multiplier
        max-attempts: 3 # 最大重试次数
```

我们利用命令停掉RabbitMQ服务：
```shell
docker stop mq
```
然后测试发送一条消息，会发现会每隔1秒重试1次，总共重试了3次。消息发送的超时重试机制配置成功了！

**注意**：当网络不稳定的时候，利用重试机制可以有效提高消息发送的成功率。不过SpringAMQP提供的重试机制是**阻塞式**的重试，也就是说多次重试等待的过程中，当前线程是被阻塞的。
如果对于业务性能有要求，建议禁用重试机制。如果一定要使用，请合理配置等待时长和重试次数，当然也可以考虑使用异步线程来执行发送消息的代码。



## 2. 生产者确认机制

一般情况下，只要生产者与MQ之间的网路连接顺畅，基本不会出现发送消息丢失的情况，因此大多数情况下我们无需考虑这种问题。
不过，在少数情况下，也会出现消息发送到MQ之后丢失的现象，比如：

- MQ内部处理消息的进程发生了异常
- 生产者发送消息到达MQ后未找到`Exchange`
- 生产者发送消息到达MQ的`Exchange`后，未找到合适的`Queue`，因此无法路由

针对上述情况，RabbitMQ提供了生产者消息确认机制，包括`Publisher Confirm`和`Publisher Return`两种。在开启确认机制的情况下，当生产者发送消息给MQ后，MQ会根据消息处理的情况返回不同的**回执**。
具体如图所示：
![image-20260807174934733](/covers/java-mq-rabbitmq-2-mq-3zcrum/image-20260807174934733.webp)
总结如下：

- 当消息投递到MQ，但是路由失败时，通过**Publisher Return**返回异常信息，同时返回ack的确认信息，代表投递成功（出现的概率极少）
- 临时消息投递到了MQ，并且入队成功，返回ACK，告知投递成功
- 持久消息投递到了MQ，并且入队完成持久化，返回ACK ，告知投递成功
- 其它情况都会返回NACK，告知投递失败

其中`ack`和`nack`属于**Publisher Confirm**机制，`ack`是投递成功；`nack`是投递失败。而`return`则属于**Publisher Return**机制。
默认两种机制都是关闭状态，需要通过配置文件来开启。



**Publisher Confirm** 和 **Publisher Return** 的核心区别在于它们**把守着消息发送过程中的不同阶段**。

在 RabbitMQ 中，一条消息从生产者发出到最终存入队列，必须经过两个节点：

**生产者 (Producer)  ——> 交换机 (Exchange) ——> 队列 (Queue)**

这两个机制就是为了分别监控这两个箭头的流转状态。以下是它们的详细对比：

**核心区别对比表**

| **维度**           | **Publisher Confirm (确认机制)**                             | **Publisher Return (退回机制)**                              |
| ------------------ | ------------------------------------------------------------ | ------------------------------------------------------------ |
| **监控阶段**       | **生产者   ——> 交换机**                                      | **交换机  ——>队列**                                          |
| **核心目的**       | 确认消息是否成功到达了 RabbitMQ 的交换机。                   | 确认到达交换机的消息，是否成功被路由到了队列。               |
| **返回信号**       | **ack** (投递成功) / **nack** (投递失败)                     | **returnedMessage** (将完整的消息体原路退回)                 |
| **触发成功的场景** | 消息完好无损地抵达了指定的 Exchange。                        | 消息根据 RoutingKey 找到了匹配的 Queue。 (成功时不会触发任何回调) |
| **触发失败的场景** | 1. 交换机名称写错/不存在。  2. 网络闪断，根本没连上 MQ 服务器。  3. MQ 内部发生严重异常。 | 1. 路由键 (RoutingKey) 拼写错误。  2. 交换机没有绑定任何队列。 |
| **配置属性**       | `publisher-confirm-type: correlated`                         | `publisher-returns: true`                                    |

**形象的比喻（寄快递）**

- **Publisher Confirm（寄件确认）**：

  你把快递包裹交给了**快递中转站（Exchange）**。

  - 中转站收到了，给你盖了个章说“已揽收**`ack`**。
  - 中转站由于某种原因（比如站点倒闭了、你走错门了）拒收你的包裹 **`nack`**。

- **Publisher Return（查无此人退回）**：

  快递中转站（Exchange）已经收下你的包裹了（Confirm 返回了 ack），但是当他们准备把包裹装上发往目的地的货车（Queue）时，发现你写的收件地址（RoutingKey）是个假地址，根本找不到对应的货车。

  - 此时，中转站只能把这个包裹原封不动地退回（Return）给你。

**总结**

因为交换机（Exchange）本身是没有存储消息的能力的，它只负责“转发”。如果只开启 Confirm 机制，遇到路由失败的情况（拿到 ack，但消息被丢弃），消息依然会丢失。

因此，**Confirm 和 Return 必须组合使用**，才能实现发送端 100% 的消息可靠投递保障。



## 3. 实现生产者确认

### 1. 开启生产者确认
在publisher模块的`application.yaml`中添加配置：
```yaml
spring:
  rabbitmq:
    publisher-confirm-type: correlated # 开启publisher confirm机制，并设置confirm类型
    publisher-returns: true # 开启publisher return机制
```
这里`publisher-confirm-type`有三种模式可选：

- `none`：关闭confirm机制
- `simple`：同步阻塞等待MQ的回执
- `correlated`：MQ异步回调返回回执

一般我们推荐使用`correlated`，回调机制。



### 2. 定义ReturnsCallback

`rabbitTemplate.setReturnsCallback(...)`，它**仅仅只对 Publisher Return（退回机制）生效**。这意味着，只有当消息遇到了“成功到达了交换机，但找不到队列（路由失败）”这种情况时，这段代码才会被触发。

每个`RabbitTemplate`只能配置一个`ReturnsCallback`，因此我们可以在配置类中统一设置。我们在publisher模块定义一个配置类，内容如下：

**全局配置类属于“一次编写，到处生效”。后续你在任何业务 Service 里发消息，只要记得 `注入 RabbitTemplate -> 封装 CorrelationData -> 带参发送`**

```java
/**
 * RabbitMQ 全局通用配置类
 * 统一处理消息确认、路由退回等全局机制
 */
@Slf4j
@Configuration
public class RabbitCommonConfig implements ApplicationContextAware {
    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        // 1. 从 Spring 容器中安全获取全局唯一的 RabbitTemplate
        RabbitTemplate rabbitTemplate = applicationContext.getBean(RabbitTemplate.class);
        // 2. 设置退回机制回调
        rabbitTemplate.setReturnsCallback(returnedMessage -> {
            log.error("【MQ消息路由失败】触发退回机制!");
            log.error("============== 失败详情 ==============");
            log.error("交换机(Exchange): {}", returnedMessage.getExchange());
            log.error("路由键(RoutingKey): {}", returnedMessage.getRoutingKey());
            log.error("应答码(ReplyCode): {}", returnedMessage.getReplyCode());
            log.error("应答文本(ReplyText): {}", returnedMessage.getReplyText());
            log.error("消息内容(Message): {}", new String(returnedMessage.getMessage().getBody()));
            log.error("=====================================");
            
            // TODO: 在此处添加业务补偿逻辑
            // 例如：将 messageId 对应的本地消息表状态改为 FAIL，等待后续定时任务重试
        });
    }
}
```



### 3. 定义ConfirmCallback

我们之前讨论的 `@Configuration` 全局配置类是“统管全局”的通用方案，那么这张图片里教你的，就是“单兵作战”的局部方案。

它展示了 Spring AMQP 提供的一种更精细的控制方式：**为每一次发送的具体消息，单独定制 Confirm 回调逻辑。**



由于每个消息发送时的处理逻辑不一定相同，因此ConfirmCallback需要在每次发消息时定义。具体来说，是在调用RabbitTemplate中的convertAndSend方法时，多传递一个参数：
![image-20260807195431181](/covers/java-mq-rabbitmq-2-mq-3zcrum/image-20260807195431181.png)
这里的CorrelationData中包含两个核心的东西：

- `id`：消息的唯一标示，MQ对不同的消息的回执以此做判断，避免混淆
- `SettableListenableFuture`：回执结果的Future对象

将来MQ的回执就会通过这个`Future`来返回，我们可以提前给`CorrelationData`中的`Future`添加回调函数来处理消息回执：
![image-20260807195450989](/covers/java-mq-rabbitmq-2-mq-3zcrum/image-20260807195450989.png)

我们新建一个测试，向系统自带的交换机发送消息，并且添加`ConfirmCallback`：
```java
@Test
void testPublisherConfirm() {
    // 1.创建CorrelationData,并设置唯一ID
    CorrelationData cd = new CorrelationData(UUID.randomUUID().toString());
    // 2.给Future添加ConfirmCallback
    cd.getFuture().addCallback(new ListenableFutureCallback<CorrelationData.Confirm>() {
        @Override
        public void onFailure(Throwable ex) {
            // 2.1.Future发生异常时的处理逻辑，基本不会触发
            log.error("send message fail", ex);
        }
        @Override
        public void onSuccess(CorrelationData.Confirm result) {
            // 2.2.Future接收到回执的处理逻辑，参数中的result就是回执内容
            if(result.isAck()){ // result.isAck()，boolean类型，true代表ack回执，false 代表 nack回执
                log.debug("发送消息成功，收到 ack!");
            }else{ // result.getReason()，String类型，返回nack时的异常描述
                log.error("发送消息失败，收到 nack, reason : {}", result.getReason());
            }
        }
    });
    // 3.发送消息
    rabbitTemplate.convertAndSend("hmall.direct", "q", "hello", cd);
}
```
执行结果如下：
![image-20260807195505965](/covers/java-mq-rabbitmq-2-mq-3zcrum/image-20260807195505965.webp)
可以看到，由于传递的`RoutingKey`是错误的，路由失败后，触发了`return callback`，同时也收到了ack。
当我们修改为正确的`RoutingKey`以后，就不会触发`return callback`了，只收到ack。
而如果连交换机都是错误的，则只会收到nack。



```java
// 1. 创建 CorrelationData
CorrelationData cd = new CorrelationData();

// 2. 直接在 cd 的 Future 上挂载回调逻辑
cd.getFuture().addCallback(new ListenableFutureCallback<CorrelationData.Confirm>() {
    @Override
    public void onFailure(Throwable ex) {
        // 这是 Spring 框架内部抛异常才会走到这里，比如连接 MQ 服务器彻底失败
    }

    @Override
    public void onSuccess(CorrelationData.Confirm result) {
        // 这是 MQ 正常返回了应答
        if(result.isAck()){
            // 成功抵达交换机
        }else{
            // 没抵达交换机，打印 result.getReason()
        }
    }
});

// 3. 发送消息，带上这个定制好的 cd
rabbitTemplate.convertAndSend("exchange", "routingKey", "msg", cd);
```

**这种写法的好处**：如果你的系统里有 100 种消息，其中 99 种丢了也就丢了无所谓，只有 1 种“核心扣款消息”绝对不能丢。你就可以不写全局的配置类，只在发扣款消息的这几行代码里加上单独的 ConfirmCallback，这样处理起来非常灵活。



**注意**：
开启生产者确认比较消耗MQ性能，一般不建议开启。而且大家思考一下触发确认的几种情况：

- 路由失败：一般是因为RoutingKey错误导致，往往是编程导致
- 交换机名称错误：同样是编程错误导致
- MQ内部故障：这种需要处理，但概率往往较低。因此只有对消息可靠性要求非常高的业务才需要开启，而且仅仅需要开启ConfirmCallback处理nack就可以了，不需要设置ReturnsCallback

**💡 总结：项目中的黄金架构标准该怎么写？**

为了代码的整洁、高性能以及可靠性，在实际项目中，我们通常会采用“全局兜底 + 局部定制”的混搭策略：

1. **必须要写 `RabbitCommonConfig`（全局）**： 在这个配置类里面，只配置 `rabbitTemplate.setReturnsCallback(...)`，用来全局兜底所有的“路由键写错”、“交换机没绑定队列”等严重异常。
2. **按业务需求使用 `Future`（局部）**：
   - 对于像“系统操作日志”、“普通消息通知”这种丢了也无所谓的边缘业务，直接发出去就行，不要加 Confirm 回调，以保证 MQ 的超高吞吐量。
   - 对于“创建订单”、“扣减库存”这种**核心金融交易数据**，采用图片里的 `cd.getFuture().addCallback(...)` 局部写法，一旦回调发现 `ack=false`，立即将数据库里的本地消息表状态改为失败，精准控制。

# 2. MQ的可靠性
消息到达MQ以后，如果MQ不能及时保存，也会导致消息丢失，所以MQ的可靠性也非常重要。
## 1. 数据持久化
为了提升性能，默认情况下MQ的数据都是在内存存储的临时数据，重启后就会消失。为了保证数据的可靠性，必须配置数据持久化，包括：

- 交换机持久化
- 队列持久化
- 消息持久化

如果说发送端确认机制是为了防止消息“死在半路上”，那么持久化机制就是为了防止消息“死在 MQ 的内存里”。RabbitMQ 默认会将消息暂存在内存中以换取极高的吞吐量，但如果遇到服务器断电、进程崩溃或重启，内存里的数据就会瞬间清空。

为了防止这种情况，我们必须将数据写入磁盘。在 Spring Boot 体系中，实现完全的持久化需要同时达成“铁三角”：交换机持久化、队列持久化、消息持久化。缺一不可。

在 Spring Boot 体系下，官方在设计 API 时采取了“安全第一”**的防丢理念。因此，\**默认情况下\**，使用代码生成的交换机和队列都是持久化的**

### 1. 交换机持久化 (Exchange Durability)

交换机不负责存储消息，只负责路由。如果不持久化，MQ 重启后交换机会消失，生产者发送的消息将找不到目的地。

在 Spring Boot 中通过 `@Bean` 声明交换机时，只需将 `durable` 参数设置为 `true`：

```java
import org.springframework.amqp.core.DirectExchange;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MqConfig {
    
    @Bean
    public DirectExchange myExchange() {
        // 参数1: 交换机名称
        // 参数2: durable (是否持久化) -> 设为 true
        // 参数3: autoDelete (是否自动删除) -> 设为 false
        return new DirectExchange("my_direct_exchange", true, false);
    }
}
```

### 2. 队列持久化 (Queue Durability)

队列是真正用来存放消息的容器。如果不持久化，MQ 重启后队列会被销毁，里面的消息自然也就跟着灰飞烟灭了。

声明队列时，同样将 `durable` 设置为 `true`：

```java
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class MqConfig {

    @Bean
    public Queue myQueue() {
        // 参数1: 队列名称
        // 参数2: durable (是否持久化) -> 设为 true
        return new Queue("my_queue", true);
        
        // 或者使用 Builder 模式 (推荐，语义更清晰)
        // return QueueBuilder.durable("my_queue").build();
    }
}
```

### 3. 消息持久化 (Message Durability)

**这是面试中最容易踩坑的地方！** 很多开发者以为把队列持久化了，里面的消息就安全了。其实不然，如果队列持久化了，但消息没有持久化，MQ 重启后，**队列还在，但里面的消息会全空**。

消息持久化要求我们在发送消息时，将消息的 `DeliveryMode` 属性设置为 `2`（持久化）。

**好消息是**：在 Spring Boot 环境下，当你使用 `RabbitTemplate` 的 `convertAndSend` 方法发送消息时，Spring 底层已经**默认**帮你把消息体中的 `DeliveryMode` 设置为持久化模式了。你不需要专门写额外的代码，直接发送即可。

### 4. 注解

**`durable = "true"`**：在 `@Queue` 和 `@Exchange` 注解中，默认其实就是 `true`，但显式写出来会让代码的语义（持久化防丢失）更加明确

```java
@Slf4j
@Component
public class MyMessageConsumer {

    /**
     * @QueueBinding: 核心绑定注解，用于将队列和交换机绑定在一起
     *      value: 配置队列 (Queue)
     *      exchange: 配置交换机 (Exchange)
     *      key: 配置路由键 (RoutingKey)
     */
    @RabbitListener(bindings = @QueueBinding(
            // 1. 声明队列：名称为 my_queue，durable = "true" 表示开启队列持久化
            value = @Queue(name = "my_queue", durable = "true"),
            
            // 2. 声明交换机：名称为 my_direct_exchange，类型为 direct，开启持久化
            exchange = @Exchange(name = "my_direct_exchange", type = "direct", durable = "true"),
            
            // 3. 声明路由键：绑定这两者的桥梁
            key = "my.routing.key"
    ))
    public void processMessage(String message) {
        log.info("成功接收到 MQ 消息: {}", message);
        
        // TODO: 在这里编写你的业务逻辑，比如扣减库存、更新订单状态等
    }
}
```

**💡 架构设计的 Trade-off（权衡与避坑）**

在实际的企业级项目落地和日常实习的面试中，面试官往往会追问持久化带来的**副作用**：

1. **性能极速下降**：写磁盘（I/O 操作）的速度远远慢于写内存。全面开启持久化后，RabbitMQ 的单机吞吐量可能会从每秒几万条骤降到几千条。

2. **木桶效应**：**队列持久化 + 消息持久化，两者必须同时存在**，消息才能真正存活。

3. **并非 100% 绝对安全**：

   哪怕你开启了全套持久化，依然存在一个极其微小的“真空期”：当 MQ 刚收到消息，还没来得及把数据刷入磁盘（fsync 操作），服务器正好断电了。此时消息依然会丢失。

   *解决办法*：对于核心金融数据，一般会结合 **Confirm 机制 + 仲裁队列（Quorum Queues）**，确保消息不仅落盘，还要在多个节点上复制成功后，才给生产者返回 `ack=true`。



## 2. LazyQueue
在默认情况下，RabbitMQ会将接收到的信息保存在内存中以降低消息收发的延迟。但在某些特殊情况下，这会导致消息积压，比如：

- 消费者宕机或出现网络故障
- 消息发送量激增，超过了消费者处理速度
- 消费者处理业务发生阻塞

一旦出现消息堆积问题，RabbitMQ的内存占用就会越来越高，直到触发内存预警上限。此时RabbitMQ会将内存消息刷到磁盘上，这个行为成为`PageOut`. `PageOut`会耗费一段时间，并且会阻塞队列进程。因此在这个过程中RabbitMQ不会再处理新的消息，生产者的所有请求都会被阻塞。

为了解决这个问题，从RabbitMQ的3.6.0版本开始，就增加了Lazy Queues的模式，也就是惰性队列。惰性队列的特征如下：

- 接收到消息后直接存入磁盘而非内存（内存中只保留最近的消息，默认2048条）
- 消费者要消费消息时才会从磁盘中读取并加载到内存（也就是懒加载）
- 支持数百万条的消息存储

Lazy Queue 用**极其稳定的海量堆积能力**（可以轻松堆积数千万条消息而不崩溃）和**超低的内存占用**，换取了一点点**延迟时间的增加**（因为每次消费都要读盘）

而在3.12版本之后，LazyQueue已经成为所有队列的默认格式。因此官方推荐升级MQ为3.12版本或者所有队列都设置为LazyQueue模式。

### 1. 控制台配置Lazy模式
在添加队列的时候，添加`x-queue-mod=lazy`参数即可设置队列为Lazy模式：
![image-20260807202050974](/covers/java-mq-rabbitmq-2-mq-3zcrum/image-20260807202050974.webp)



### 2. 代码配置Lazy模式

在利用SpringAMQP声明队列的时候，添加`x-queue-mod=lazy`参数也可设置队列为Lazy模式：
```java
@Bean
public Queue lazyQueue(){
    return QueueBuilder
            .durable("lazy.queue")
            .lazy() // 开启Lazy模式
            .build();
}
```
这里是通过`QueueBuilder`的`lazy()`函数配置Lazy模式，底层源码如下：
![image-20260807202630467](/covers/java-mq-rabbitmq-2-mq-3zcrum/image-20260807202630467.webp)

当然，我们也可以基于注解来声明队列并设置为Lazy模式：
```java
@RabbitListener(queuesToDeclare = @Queue(
        name = "lazy.queue",
        durable = "true",
        arguments = @Argument(name = "x-queue-mode", value = "lazy")
))
public void listenLazyQueue(String msg){
    log.info("接收到 lazy.queue的消息：{}", msg);
}
```

# 3. 消费者的可靠性
当RabbitMQ向消费者投递消息以后，需要知道消费者的处理状态如何。因为消息投递给消费者并不代表就一定被正确消费了，可能出现的故障有很多，比如：

- 消息投递的过程中出现了网络故障
- 消费者接收到消息后突然宕机
- 消费者接收到消息后，因处理不当导致异常
- ...

一旦发生上述情况，消息也会丢失。因此，RabbitMQ必须知道消费者的处理状态，一旦消息处理失败才能重新投递消息。
但问题来了：RabbitMQ如何得知消费者的处理状态呢？



## 1. 消费者确认机制 

为了确认消费者是否成功处理消息，RabbitMQ提供了消费者确认机制（**Consumer Acknowledgement**）。即：当消费者处理消息结束后，应该向RabbitMQ发送一个回执，告知RabbitMQ自己消息处理状态。回执有三种可选值：

- ack：成功处理消息，RabbitMQ从队列中删除该消息
- nack：消息处理失败，RabbitMQ需要再次投递消息
- reject：消息处理失败并拒绝该消息，RabbitMQ从队列中删除该消息

一般reject方式用的较少，除非是消息格式有问题，那就是开发问题了。因此大多数情况下我们需要将消息处理的代码通过`try catch`机制捕获，消息处理成功时返回ack，处理失败时返回nack.

由于消息回执的处理代码比较统一，因此SpringAMQP帮我们实现了消息确认。并允许我们通过配置文件设置ACK处理方式，有三种模式：

- `none`：不处理。即消息投递给消费者后立刻ack，消息会立刻从MQ删除。非常不安全，不建议使用
- `manual`：手动模式。需要自己在业务代码中调用api，发送`ack`或`reject`，存在业务入侵，但更灵活
- `auto`：自动模式。SpringAMQP利用AOP对我们的消息处理逻辑做了环绕增强，当业务正常执行时则自动返回`ack`.  当业务出现异常时，根据异常判断返回不同结果：
   - 如果是**业务异常**，会自动返回`nack`；
   - 如果是**消息处理或校验异常**，自动返回`reject`;


通过下面的配置可以修改SpringAMQP的ACK处理方式：
```yaml
spring:
  rabbitmq:
    listener:
      simple:
        acknowledge-mode: none # 不做处理
```

修改consumer服务的SpringRabbitListener类中的方法，模拟一个消息处理的异常：
```java
@RabbitListener(queues = "simple.queue")
public void listenSimpleQueueMessage(String msg) throws InterruptedException {
    log.info("spring 消费者接收到消息：【" + msg + "】");
    if (true) {
        throw new MessageConversionException("故意的");
    }
    log.info("消息处理完成");
}
```

测试可以发现：当消息处理发生异常时，消息依然被RabbitMQ删除了。


我们再次把确认机制修改为auto：
```yaml
spring:
  rabbitmq:
    listener:
      simple:
        acknowledge-mode: auto # 自动ack
```

在异常位置打断点，再次发送消息，程序卡在断点时，可以发现此时消息状态为`unacked`（未确定状态）：
![image-20260808110345252](/covers/java-mq-rabbitmq-2-mq-3zcrum/image-20260808110345252.webp)
放行以后，由于抛出的是**消息转换异常**，因此Spring会自动返回`reject`，所以消息依然会被删除：
![image-20260808110330268](/covers/java-mq-rabbitmq-2-mq-3zcrum/image-20260808110330268.webp)

我们将异常改为RuntimeException类型：
```java
@RabbitListener(queues = "simple.queue")
public void listenSimpleQueueMessage(String msg) throws InterruptedException {
    log.info("spring 消费者接收到消息：【" + msg + "】");
    if (true) {
        throw new RuntimeException("故意的");
    }
    log.info("消息处理完成");
}
```
在异常位置打断点，然后再次发送消息测试，程序卡在断点时，可以发现此时消息状态为`unacked`（未确定状态）：
![image-20260808110318381](/covers/java-mq-rabbitmq-2-mq-3zcrum/image-20260808110318381.webp)

放行以后，由于抛出的是业务异常，所以Spring返回`ack`，最终消息恢复至`Ready`状态，并且没有被RabbitMQ删除：
![image-20260808110257414](/covers/java-mq-rabbitmq-2-mq-3zcrum/image-20260808110257414.webp)
当我们把配置改为`auto`时，消息处理失败后，会回到RabbitMQ，并重新投递到消费者。



## 2. 失败重试机制

当消费者出现异常后，消息会不断requeue（重入队）到队列，再重新发送给消费者。如果消费者再次执行依然出错，消息会再次requeue到队列，再次投递，直到消息处理成功为止。
极端情况就是消费者一直无法执行成功，那么消息requeue就会无限循环，导致mq的消息处理飙升，带来不必要的压力：

当然，上述极端情况发生的概率还是非常低的，不过不怕一万就怕万一。为了应对上述情况Spring又提供了消费者失败重试机制：在消费者出现异常时利用本地重试，而不是无限制的requeue到mq队列。

修改consumer服务的application.yml文件，添加内容：
```yaml
spring:
  rabbitmq:
    listener:
      simple:
        retry:
          enabled: true # 开启消费者失败重试
          initial-interval: 1000ms # 初识的失败等待时长为1秒
          multiplier: 1 # 失败的等待时长倍数，下次等待时长 = multiplier * last-interval
          max-attempts: 3 # 最大重试次数
          stateless: true # true无状态；false有状态。如果业务中包含事务，这里改为false
```

重启consumer服务，重复之前的测试。可以发现：

- 消费者在失败后消息没有重新回到MQ无限重新投递，而是在本地重试了3次
- 本地重试3次以后，抛出了`AmqpRejectAndDontRequeueException`异常。查看RabbitMQ控制台，发现消息被删除了，说明最后SpringAMQP返回的是`reject`

结论：

- 开启本地重试时，消息处理过程中抛出异常，不会requeue到队列，而是在消费者本地重试
- 重试达到最大次数后，Spring会返回reject，消息会被丢弃



## 3. 失败处理策略

在之前的测试中，本地测试达到最大重试次数后，消息会被丢弃。这在某些对于消息可靠性要求较高的业务场景下，显然不太合适了。
因此Spring允许我们自定义重试次数耗尽后的消息处理策略，这个策略是由`MessageRecovery`接口来定义的，它有3个不同实现：

-  `RejectAndDontRequeueRecoverer`：重试耗尽后，直接`reject`，丢弃消息。默认就是这种方式 （这会导致消息丢失，生产环境极其不推荐！）
-  `ImmediateRequeueMessageRecoverer`：重试耗尽后，返回`nack`，消息重新入队 （这会导致死循环，违背了配置本地重试的初衷，不推荐！）
-  `RepublishMessageRecoverer`：重试耗尽后，将失败消息投递到指定的交换机 

比较优雅的一种处理方案是`RepublishMessageRecoverer`，失败后将消息投递到一个指定的，专门存放异常消息的队列，后续由人工集中处理。

![image-20260808160403526](/covers/java-mq-rabbitmq-2-mq-3zcrum/image-20260808160403526.webp)

**绝对原则：消费者遇到错误时，必须把异常抛出！**

```java
@Configuration
public class ErrorMessageConfig {

    public static final String ERROR_EXCHANGE = "error.exchange";
    public static final String ERROR_QUEUE = "error.queue";
    public static final String ERROR_ROUTING_KEY = "error.routing.key";

    // 1. 声明异常交换机
    @Bean
    public DirectExchange errorExchange() {
        return new DirectExchange(ERROR_EXCHANGE);
    }

    // 2. 声明异常队列
    @Bean
    public Queue errorQueue() {
        return new Queue(ERROR_QUEUE);
    }

    // 3. 绑定异常队列和异常交换机
    @Bean
    public Binding errorBinding() {
        return BindingBuilder.bind(errorQueue()).to(errorExchange()).with(ERROR_ROUTING_KEY);
    }

    // 4. 配置 RepublishMessageRecoverer，覆盖 Spring 默认的丢弃策略
    @Bean
    public MessageRecoverer republishMessageRecoverer(RabbitTemplate rabbitTemplate) {
        // 参数：RabbitTemplate, 目标交换机名称, 目标路由键
        return new RepublishMessageRecoverer(rabbitTemplate, ERROR_EXCHANGE, ERROR_ROUTING_KEY);
    }
}
```

**完整的、健壮的消息消费流程应该是这样的：**

1. 消费者收到消息。
2. 业务处理失败抛出异常。
3. Spring 拦截异常，**在本地线程挂起等待**，按配置的递增时间（1s, 2s...）重试。
4. 重试 3 次仍然失败，Spring 判定此消息彻底无救。
5. 触发 `RepublishMessageRecoverer`，Spring 自动将消息投递到 `error.queue`。
6. Spring 给原来的队列发送 `ack`，将该消息从原队列中删除，防止阻塞。
7. 运维人员第二天上班，查阅 `error.queue` 里的死信，修复 Bug 后手动回放处理。



## 4. 业务幂等性

何为幂等性？
**幂等**是一个数学概念，用函数表达式来描述是这样的：`f(x) = f(f(x))`，例如求绝对值函数。
在程序开发中，则是指同一个业务，执行一次或多次对业务状态的影响是一致的。例如：

- 根据id删除数据
- 查询数据
- 新增数据

但数据的更新往往不是幂等的，如果重复执行可能造成不一样的后果。比如：

- 取消订单，恢复库存的业务。如果多次恢复就会出现库存重复增加的情况
- 退款业务。重复退款对商家而言会有经济损失。

所以，我们要尽可能避免业务被重复执行。
然而在实际业务场景中，由于意外经常会出现业务被重复执行的情况，例如：

- 页面卡顿时频繁刷新导致表单重复提交
- 服务间调用的重试
- MQ消息的重复投递

我们在用户支付成功后会发送MQ消息到交易服务，修改订单状态为已支付，就可能出现消息重复投递的情况。如果消费者不做判断，很有可能导致消息被消费多次，出现业务故障。
举例：

1. 假如用户刚刚支付完成，并且投递消息到交易服务，交易服务更改订单为**已支付**状态。
2. 由于某种原因，例如网络故障导致生产者没有得到确认，隔了一段时间后**重新投递**给交易服务。
3. 但是，在新投递的消息被消费之前，用户选择了退款，将订单状态改为了**已退款**状态。
4. 退款完成后，新投递的消息才被消费，那么订单状态会被再次改为**已支付**。业务异常。



要实现幂等性，前提是每一条消息都必须有一个**全局唯一的标识（Business ID 或 Message ID）**，比如订单号 `orderId`。

### 1. 数据库唯一索引（DB 的终极防线，最推荐）

利用关系型数据库（MySQL）的 `Unique Key` 机制来防重。

- **做法：** 建立一张独立的 `mq_consumed_record`（消息消费记录表），包含一个唯一的 `message_id` 字段。每次消费消息前，先 `INSERT` 一条记录。
- **效果：** 如果是重复消息，第二次 `INSERT` 时数据库会报主键冲突异常（`DuplicateKeyException`）。我们在代码里 catch 住这个异常，直接返回 `ack` 给 MQ，告诉它“这条消息之前处理过了，当成功算吧”。
- **优点：** 简单粗暴，100% 绝对可靠。

### 2. Redis 分布式锁（性能屏障）

如果你的系统并发极高，直接把请求打到 MySQL 会导致数据库扛不住，可以引入 Redis。

- **做法：** 消费者收到消息后，拿 `orderId` 去 Redis 里执行 `SETNX` (Set if Not eXists) 命令。
- **效果：**
  - 如果设置成功，说明是第一次消费，放行去执行真正的业务逻辑。
  - 如果设置失败，说明已经被别人抢占或者处理过了，直接丢弃（打个日志，给 MQ 发送 `ack`）。
- **注意：** 记得给 Redis 的 Key 设置一个合理的过期时间（比如 24 小时），防止死锁，也节省内存。

### 3. 状态机 / 乐观锁控制（结合业务逻辑）

这种方式不需要额外的表或 Redis，直接在业务数据上做文章。

- **基于状态机：** 比如订单有状态：`1-待支付`、`2-已支付`、`3-已发货`。当收到“支付成功”的消息时，SQL 这样写： `UPDATE order SET status = 2 WHERE id = 100 AND status = 1;` 如果是重复的支付消息，由于第一次执行后状态已经变成了 2，第二次执行时 `WHERE status = 1` 就不成立，更新行数为 0，这就实现了幂等。
- **基于版本号 (乐观锁)：** 给表加一个 `version` 字段。每次更新 `version = version + 1 WHERE version = old_version`。

**企业级标准处理流程**

在实际开发中，为了兼顾**性能**与**可靠性**，通常会把方案一和方案二结合起来（Redis 挡并发 + MySQL 兜底）：

1. 消费者收到消息，提取 `业务流水号 (bizId)`。
2. 去 Redis 执行 `SETNX bizId`，如果失败，说明重复，直接 ACK 并返回。
3. 如果成功，开启数据库事务。
4. 检查业务表状态（状态机校验）或插入防重表。若发现已处理，直接 ACK 并返回。
5. **执行核心业务逻辑**（如加积分、扣库存）。
6. 提交事务。
7. 如果第 4~6 步发生异常，回滚事务，并**删除 Redis 中的 Key**（很重要，否则这条消息就再也无法重试了），让 Spring 重试机制接管。

# 4. 延迟消息

**延迟消息：生产者发送消息时指定一个时间，消费者不会立刻收到消息，而是在指定消息之后才收到消息**

**延迟任务：设置在一定时间之后才执行的任务**

在电商的支付业务中，对于一些库存有限的商品，为了更好的用户体验，通常都会在用户下单时立刻扣减商品库存。例如电影院购票、高铁购票，下单后就会锁定座位资源，其他人无法重复购买。

但是这样就存在一个问题，假如用户下单后一直不付款，就会一直占有库存资源，导致其他客户无法正常交易，最终导致商户利益受损！

因此，电商中通常的做法就是：**对于超过一定时间未支付的订单，应该立刻取消订单并释放占用的库存**。

例如，订单支付超时时间为30分钟，则我们应该在用户下单后的第30分钟检查订单支付状态，如果发现未支付，应该立刻取消订单，释放库存。

但问题来了：如何才能准确的实现在下单后第30分钟去检查支付状态呢？

像这种在一段时间以后才执行的任务，我们称之为**延迟任务**，而要实现延迟任务，最简单的方案就是利用MQ的延迟消息了。

在RabbitMQ中实现延迟消息也有两种方案：

- 死信交换机+TTL
- 延迟消息插件



## 1. 死信交换机
什么是死信？

当一个队列中的消息满足下列情况之一时，可以成为死信（dead letter）：

- 消费者使用`basic.reject`或 `basic.nack`声明消费失败，并且消息的`requeue`参数设置为false
- 消息是一个过期消息，超时无人消费
- 要投递的队列消息满了，无法投递

如果一个队列中的消息已经成为死信，并且这个队列通过`**dead-letter-exchange**`属性指定了一个交换机，那么队列中的死信就会投递到这个交换机中，而这个交换机就称为**死信交换机**（Dead Letter Exchange）。而此时加入有队列与死信交换机绑定，则最终死信就会被投递到这个队列中。

死信交换机有什么作用呢？

1. 收集那些因处理失败而被拒绝的消息
2. 收集那些因队列满了而被拒绝的消息
3. 收集因TTL（有效期）到期的消息



前面两种作用场景可以看做是把死信交换机当做一种消息处理的最终兜底方案，与消费者重试时讲的`RepublishMessageRecoverer`作用类似。

而最后一种场景，大家设想一下这样的场景：

![image-20260808171819201](/covers/java-mq-rabbitmq-2-mq-3zcrum/image-20260808171819201.webp)
**注意：**
RabbitMQ的消息过期是基于追溯方式来实现的，也就是说当一个消息的TTL到期以后不一定会被移除或投递到死信交换机，而是在消息恰好处于队首时才会被处理。
当队列中消息堆积很多的时候，过期消息可能不会被按时处理，因此你设置的TTL时间不一定准确。



## 2. DelayExchange插件

正常情况下，RabbitMQ 的交换机（Exchange）是不存储消息的，它只负责路由。 但安装了该插件后，会新增一种交换机类型：`x-delayed-message`。

1. **暂存消息：** 当生产者发送带有延迟时间标记的消息到该交换机时，交换机**不会立即路由**，而是将消息暂存在 RabbitMQ 的内部数据库（Mnesia）中。
2. **到期路由：** 交换机会在内部启动定时器，当消息的延迟时间到达后，交换机才会根据 Routing Key 将消息投递到绑定的目标队列中。
3. **消费：** 消费者在目标队列中监听并正常消费消息。



### 1. 部署
**第一阶段：准备插件文件**

1. 根据你的 RabbitMQ 版本（如 `3.12`），去官方 GitHub 发布页下载对应的 `.ez` 格式插件包（例如：`rabbitmq_delayed_message_exchange-3.12.0.ez`）。插件下载地址：[GitHub - rabbitmq/rabbitmq-delayed-message-exchange: Delayed Messaging for RabbitMQ](https://github.com/rabbitmq/rabbitmq-delayed-message-exchange)
2. 先将文件下载到你的物理机（Windows）电脑上。

**第二阶段：跨越第一道墙（Windows -> Linux 虚拟机）**

1. 打开你常用的 SSH 客户端工具（如 FinalShell、Xftp、MobaXterm 等），连接到你的 Linux 虚拟机。
2. 将 Windows 上的 `.ez` 文件拖拽或上传到虚拟机内部的某个目录下（例如上传到 `/root` 目录）。

**第三阶段：跨越第二道墙（Linux 虚拟机 -> Docker 容器）**

1. 在虚拟机的 SSH 终端里，使用 `cd` 命令切换到你刚才存放文件的目录。

2. 执行 `docker cp` 命令，将宿主机上的文件强行拷贝到 RabbitMQ 容器的官方插件目录中：

   ```bash
   docker cp rabbitmq_delayed_message_exchange-3.12.0.ez rabbitmq:/plugins
   ```

   *(注：命令中的 `rabbitmq` 是你的容器名称，`/plugins` 是容器内的目标路径)*

**第四阶段：激活与重启**

1. 在虚拟机终端里，通过 `docker exec` 进入容器内部执行开启插件的命令：

   ```bash
   docker exec -it rabbitmq rabbitmq-plugins enable rabbitmq_delayed_message_exchange
   ```

2. 重启该容器，让配置彻底加载并生效：

   ```bash
   docker restart rabbitmq
   ```

   *(注：只要执行过一次 enable，配置就会自启动，后续重启虚拟机或容器都不需要再重新配置)*

**第五阶段：最终验证**

1. 在 Windows 浏览器中打开 RabbitMQ 管理后台（[http://192.168.146.130:15672](http://192.168.146.130:15672)）。
2. 点击 **Exchanges** 标签页，展开底部的 **Add a new exchange** 面板。
3. 点击 **Type** 旁边的下拉菜单，如果列表里出现了 **`x-delayed-message`** 选项，即代表部署圆满成功。



### 2. 声明延迟交换机

基于注解方式：
```java
@RabbitListener(bindings = @QueueBinding(
        value = @Queue(name = "delay.queue", durable = "true"),
        exchange = @Exchange(name = "delay.direct", delayed = "true"),
        key = "delay"
))
public void listenDelayMessage(String msg){
    log.info("接收到delay.queue的延迟消息：{}", msg);
}
```
基于`@Bean`的方式：
```java
@Slf4j
@Configuration
public class DelayExchangeConfig {

    @Bean
    public DirectExchange delayExchange(){
        return ExchangeBuilder
                .directExchange("delay.direct") // 指定交换机类型和名称
                .delayed() // 设置delay的属性为true
                .durable(true) // 持久化
                .build();
    }

    @Bean
    public Queue delayedQueue(){
        return new Queue("delay.queue");
    }
    
    @Bean
    public Binding delayQueueBinding(){
        return BindingBuilder.bind(delayedQueue()).to(delayExchange()).with("delay").noargs();
    }
}

```



### 3. 发送延迟消息

发送消息时，必须通过x-delay属性设定延迟时间：
```java
@Test
void testPublisherDelayMessage() {
    // 1.创建消息
    String message = "hello, delayed message";
    // 2.发送消息，利用消息后置处理器添加消息头
    rabbitTemplate.convertAndSend("delay.direct", "delay", message, msg -> {
    // 依然使用 Spring 提供的便捷方法
    msg.getMessageProperties().setHeader("x-delay", delayMillis);
    return msg;
});
}
```
