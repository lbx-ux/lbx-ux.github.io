---
title: 1.邮箱验证码
description: 在SpringBoot中实现邮箱验证码登录，最标准的方案是结合SpringMail（发送邮件）和Redis（存储验证码并设置过期时间）。整个流程非常清晰：用户输入邮箱后端生成随机验证码存入Redis并
pubDate: 2026-07-01
series: 验证码
order: 1
source: 实战/验证码/1.邮箱验证码.md
---

在 Spring Boot 中实现邮箱验证码登录，最标准的方案是结合 **Spring Mail**（发送邮件）和 **Redis**（存储验证码并设置过期时间）。

整个流程非常清晰：用户输入邮箱 -> 后端生成随机验证码 -> 存入 Redis 并设置有效期（如 5 分钟） -> 通过邮件发送给用户 -> 用户输入验证码点击登录 -> 后端校验 Redis 中的验证码是否一致 -> 完成登录。

以下是详细的整合步骤和核心代码：

### 1. 引入必要依赖

在你的 `pom.xml` 中引入 Web、Mail 和 Redis 相关的依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-mail</artifactId>
</dependency>

<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-redis</artifactId>
</dependency>
```

### 2. 配置 application.yml

在配置文件中配置邮箱的 SMTP 服务器和 Redis 连接信息。这里以 QQ 邮箱为例（网易、Gmail 同理，只需更改 host）：

```yml
spring:
  application:
    name: login
  mail:
    host: smtp.qq.com
    port: 465
    username: 2953997419@qq.com # 你的发件邮箱
    password: gfaoukqesdjpddjf    # 注意：这里填的是邮箱的”授权码”，不是登录密码！
    default-encoding: UTF-8
    properties:
      mail:
        smtp:
          auth: true
          # 关键点 :强制开启纯 SSL 加密通道
          ssl:
            enable: true
          # 关键点 ：指定使用 Java 内部的 SSL Socket 工厂来建立连接（防止 [EOF] 报错的核心）
          socketFactory:
            port: 465
            class: javax.net.ssl.SSLSocketFactory
          # 关键点 ：严禁在 465 端口开启 STARTTLS，防止协议冲突
          starttls:
            enable: false
            required: false

  data:
    redis:
      host: 192.168.146.130
      port: 6379
      password: 123456
```

> **注意：** `password` 字段千万不要填邮箱的真实登录密码。各大邮箱（QQ、网易、Gmail）出于安全考虑，都需要你在邮箱设置里单独生成一个“SMTP/POP3 服务授权码”。

**两种互斥的加密接头暗号**

发邮件时，为了保证内容不被偷看，我们需要和邮件服务器（比如 QQ 邮箱）建立加密连接。业界有两种完全不同的加密接头方式：

**1. 端口 465 (SSL 直连 - Implicit SSL)**

- **比喻：** 这是一个**绝对保密的地下室**。你只要推开门（连接 465 端口），**第一句话就必须是加密的暗语**。如果你敢说半句明文大白话，保安直接听不懂。
- **配置对应：** `port: 465` + `ssl.enable: true`

**2. 端口 587 (STARTTLS - Explicit TLS)**

- **比喻：** 这是一个**正规写字楼大堂**。你推开门进去（连接 587 端口），可以先用大白话（明文）和前台打招呼。打完招呼后，你对前台说一句指令：“`STARTTLS`（我们去密室聊吧）”。然后双方才切换到加密模式。
- **配置对应：** `port: 587` + `starttls.enable: true`

要解决这个 1 分钟的延迟，你只需要**统一暗号**，把配置改成以下两种标准方案之一即可：

**方案一：走 465 纯加密通道（推荐 QQ 邮箱使用）**

保留 465 端口，强制关掉 STARTTLS。

```yml
spring:
  mail:
    host: smtp.qq.com
    port: 465
    properties:
      mail:
        smtp:
          ssl:
            enable: true      # 开启纯 SSL
          starttls:
            enable: false     # 必须关掉 STARTTLS！
            required: false
```

**方案二：走 587 升级通道**

换成 587 端口，开启 STARTTLS。

```yml
spring:
  mail:
    host: smtp.qq.com
    port: 587               # 改成 587 端口
    properties:
      mail:
        smtp:
          ssl:
            enable: false     # 关闭纯 SSL
          starttls:
            enable: true      # 开启 STARTTLS
            required: true
```





### 3. 编写邮件发送服务 (MailService)

创建一个服务类，专门负责封装并发送邮件：

```java
@Service
@RequiredArgsConstructor
public class MailService {
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendMail(String toEmail,String code){
        SimpleMailMessage msg = new SimpleMailMessage();
        msg.setFrom(fromEmail);
        msg.setTo(toEmail);
        msg.setSubject("您的登录验证码");
        msg.setText("您好，您的登录验证码为：" + code + "。该验证码在5分钟内有效，请勿泄露给他人。");

        mailSender.send(msg);
    }
}
```

`SimpleMailMessage` 只能发送纯文本（Plain Text），没有任何排版和样式。要发送带有颜色、排版和设计感的邮件，我们需要把它升级为支持 HTML 格式的 `MimeMessage`，并结合 `MimeMessageHelper` 来构建内容。引入模板引擎可以让你的 Java 代码（只负责逻辑）和 HTML 代码（只负责页面外观）完全解耦，以后想修改邮件样式，直接改 HTML 文件就行，甚至不需要重启后端服务或重新编译代码。

在 Spring Boot 中，**Thymeleaf** 是最主流、整合最完美的模板引擎

**第一步：引入依赖**

在你的 `pom.xml` 中加入 Thymeleaf 的 Spring Boot starter。

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-thymeleaf</artifactId>
</dependency>
```

**第二步：创建 HTML 模板文件**

Spring Boot 默认会在 `src/main/resources/templates/` 目录下寻找 Thymeleaf 模板。

在该目录下创建一个名为 `email-code.html` 的文件，并填入以下内容。注意看第 15 行，我们使用了 `th:text="${code}"`，这就是 Thymeleaf 接收 Java 传值的方式。

```html
<!DOCTYPE html>
<html lang="zh-CN" xmlns:th="http://www.thymeleaf.org">
<head>
    <meta charset="UTF-8">
    <title>登录验证码</title>
</head>
<body style="margin: 0; padding: 0;">
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: f4f7fa; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: ffffff; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); overflow: hidden;">
            <div style="background-color: 4CAF50; padding: 20px; text-align: center;">
                <h2 style="color: ffffff; margin: 0; font-size: 24px;">安全验证</h2>
            </div>
            <div style="padding: 40px 30px;">
                <p style="font-size: 16px; color: 333333; margin-top: 0;">您好：</p>
                <p style="font-size: 15px; color: 555555; line-height: 1.6;">您正在进行登录/注册操作。您的验证码如下：</p>
                <div style="text-align: center; margin: 35px 0;">
                    <span th:text="${code}" style="display: inline-block; padding: 15px 40px; font-size: 32px; font-weight: bold; color: 4CAF50; background-color: e8f5e9; border: 1px dashed 4CAF50; border-radius: 6px; letter-spacing: 8px;">
                        123456
                    </span>
                </div>
                <p style="font-size: 14px; color: 888888;">此验证码在 <strong>5 分钟</strong> 内有效。请勿将此验证码转发或泄露给任何人。</p>
            </div>
            <div style="background-color: f9f9f9; padding: 20px; text-align: center; border-top: 1px solid eeeeee;">
                <p style="font-size: 12px; color: aaaaaa; margin: 0;">如果这不是您的操作，请忽略此邮件。</p>
            </div>
        </div>
    </div>
</body>
</html>
```

**第三步：修改 MailService 注入模板引擎**

我们需要注入 Spring 提供的 `TemplateEngine`，用它来读取刚才的 HTML 文件，把验证码塞进去，生成最终的 HTML 字符串。

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {
    private final JavaMailSender mailSender;
    
    // 注入 Thymeleaf 的模板引擎
    private final TemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendMail(String toEmail, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("您的登录验证码");

            // 1. 创建 Thymeleaf 的上下文对象，用于存放变量
            Context context = new Context();
            // 将生成的验证码放入上下文，键名 "code" 必须与 HTML 中的 th:text="${code}" 一致
            context.setVariable("code", code);

            // 2. 渲染模板。第一个参数 "email-code" 对应 templates 目录下的 email-code.html
            String htmlContent = templateEngine.process("email-code", context);

            // 3. 将渲染好的 HTML 字符串设置为邮件内容
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("验证码邮件已成功发送至: {}", toEmail);

        } catch (MessagingException e) {
            // 1. 记录日志（非常重要！保留给后端开发排查问题用）
            // 注意：日志里一定要传原始异常 e，这样控制台才会打印详细的堆栈跟踪
   		    log.error("邮件发送失败，目标邮箱: {}", toEmail, e);
    
           // 2. 抛出自定义业务异常（返回给前端的友好提示）
           // 这里的 500 只是举例，你可以用你项目里定义好的错误码枚举
           throw new BusinessException(500, "邮件发送繁忙，请稍后再试");
        }
    }
}
```



### 4. 编写核心业务逻辑 (UserServiceImpl)

在这里处理生成验证码、存入 Redis 以及最终的登录校验：

```java
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserMapper userMapper;
    private final MailService mailService;
    private final StringRedisTemplate redisTemplate;

    // Redis中存储验证码的 Key 前缀
    private static final String CODE_PREFIX = "login:code:";

    @Override
    public void sendCode(String email) {
        User user=userMapper.SelectByEmail(email);
        if(user!=null){
            throw new BusinessException(409,"该邮箱已被注册");
        }
        String code = String.format("%06d", new Random().nextInt(1000000));
        redisTemplate.opsForValue().set(CODE_PREFIX + email, code, 5, TimeUnit.MINUTES);
        mailService.sendMail(email, code);
    }
    
    @Override
    public void register(UserDTO userDTO) {
        User user=userMapper.SelectByEmail(userDTO.getEmail());
        if(user!=null){
            throw new BusinessException(409,"该邮箱已被注册");
        }
        //从Redis中获取验证码
        String cachedCode = redisTemplate.opsForValue().get(CODE_PREFIX + userDTO.getEmail());
        // 校验验证码是否正确且未过期
        if(cachedCode==null||!cachedCode.equals(userDTO.getCode())){
            throw new BusinessException(400,"验证码错误或已过期");
        }
        // 登录成功后，主动删除 Redis 中的验证码，防止重复使用
        redisTemplate.delete(CODE_PREFIX + userDTO.getEmail());
        
        userDTO.setPassword(passwordEncoder.encode(userDTO.getPassword()));
        User newUser = new User();
        BeanUtils.copyProperties(userDTO, newUser);
        newUser.setCreatedAt(LocalDateTime.now());
        newUser.setUpdatedAt(LocalDateTime.now());
        userMapper.register(newUser);
    }  
}
```

### 5. 暴露接口 (UserController)

最后，提供给前端调用的 RESTful 接口：

```java
@RestController
@RequestMapping("/api/v1/auth")
@Slf4j
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @PostMapping("/send-code")
    public Result<String> sendCode(@RequestBody EmailRequestDTO emailRequestDTO){
        log.info("发送验证码给: {}", emailRequestDTO.getEmail());
        userService.sendCode(emailRequestDTO.getEmail());
        return Result.success("验证码已发送");
    }
    
     @PostMapping("/register")
    public Result<String> register(@RequestBody UserDTO userDTO){
        log.info("注册用户: {}", userDTO);
        userService.register(userDTO);
        return Result.success(":注册成功");
    }  
}
```



在生产环境中，**接口防刷（限流）\**和\**异步发送**是必须要做的优化。如果不做异步，用户点击“发送”后需要白白等待 2~3 秒的网络I/O时间；不做防刷，接口极易被黑客恶意调用，导致你的邮箱账户因发送大量垃圾邮件而被服务商封禁。

下面为你提供基于 **Redis 原子操作** 和 **Spring 线程池** 的完整实现方案。

### 异步发送邮件（解决接口耗时卡顿）

Spring Boot 提供了默认的异步支持，但在实际开发中，**必须手动配置线程池**，否则高并发下默认的配置可能会导致内存溢出（OOM）。

#### 1. 创建线程池配置类 (`AsyncConfig.java`)

```java
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

@Configuration
@EnableAsync // 1. 开启异步任务支持
public class AsyncConfig {

    @Bean(name = "mailExecutor")
    public Executor mailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        // 核心线程数：线程池空闲时保持的线程数
        executor.setCorePoolSize(5);
        // 最大线程数：线程池允许的最大线程数
        executor.setMaxPoolSize(10);
        // 缓冲队列：用来缓冲等待执行任务的队列长度
        executor.setQueueCapacity(100);
        // 线程存活时间：超过核心线程数的物理线程空闲多长时间后被销毁
        executor.setKeepAliveSeconds(60);
        // 线程名前缀：方便在日志中定位问题
        executor.setThreadNamePrefix("mail-async-");
        
        // 拒绝策略：当队列和最大线程都满了，由调用方主线程处理（保证邮件不丢失）
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        
        executor.initialize();
        return executor;
    }
}
```

#### 2. 在 MailService 中使用 `@Async`

在发送邮件的方法上加上注解，并指定刚才配置的线程池名称：

```java
@Slf4j
@Service
@RequiredArgsConstructor
public class MailService {
    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Async("mailExecutor")
    public void sendMail(String toEmail,String code){
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            helper.setSubject("您的登录验证码");

            // 1. 创建 Thymeleaf 的上下文对象，用于存放变量
            Context context = new Context();
            // 将生成的验证码放入上下文，键名 "code" 必须与 HTML 中的 th:text="${code}" 一致
            context.setVariable("code", code);

            // 2. 渲染模板。第一个参数 "email-code" 对应 templates 目录下的 email-code.html
            String htmlContent = templateEngine.process("email-code", context);

            // 3. 将渲染好的 HTML 字符串设置为邮件内容
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("验证码邮件已成功发送至: {}", toEmail);

        } catch (MessagingException e) {
            log.error("邮件发送失败，目标邮箱: {}", toEmail, e);
            throw new BusinessException(500, "邮件发送繁忙，请稍后再试");
        }
    }
}
```



###  Redis 原子防刷机制（限制 60 秒发送一次）

常规的逻辑是“先查是否存在，再设置值”，但在高并发下会存在并发漏洞（线程A查到不存在，还没来得及设值，线程B也查到不存在，导致发了两封）。

我们采用 Redis 的 **`setIfAbsent`（对应 Redis 的 `SETNX` 命令）**，这是一个原子操作，能完美解决并发问题。

#### 修改 `UserServiceImpl.java`

```java
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {
    private final UserMapper userMapper;
    private final MailService mailService;
    private final PasswordEncoder passwordEncoder;
    private final StringRedisTemplate redisTemplate;

    // Redis中存储验证码的 Key 前缀
    private static final String CODE_PREFIX = "login:code:";
    // Redis中存储发送频率限制的 Key 前缀
    private static final String LIMIT_PREFIX = "login:limit:";

    @Override
    public void sendCode(String email) {
        // =================  防刷机制（原子操作） =================
        String limitKey = LIMIT_PREFIX + email;
        /*
         * setIfAbsent 尝试设置一个 Key 并在 60 秒后过期。
         * 如果 Key 不存在：设置成功，返回 true。
         * 如果 Key 已存在：设置失败，返回 false，说明 60 秒内已经发送过。
         */
        Boolean isAbsent = redisTemplate.opsForValue().setIfAbsent(limitKey, "1", 60, TimeUnit.SECONDS);

        if (Boolean.FALSE.equals(isAbsent)) {
            // 获取还剩多少秒解禁，让前端提示更友好（可选）
            Long expire = redisTemplate.getExpire(limitKey, TimeUnit.SECONDS);
            long waitSeconds = (expire != null && expire > 0) ? expire : 60;
            // 抛出自定义异常，状态码可以使用 429 (Too Many Requests)
            throw new BusinessException(429, "发送过于频繁，请 " + waitSeconds + " 秒后再试");
        }


        User user=userMapper.selectByEmail(email);
        if(user!=null){
            throw new BusinessException(409,"该邮箱已被注册");
        }
        String code = String.format("%06d", new Random().nextInt(1000000));
        redisTemplate.opsForValue().set(CODE_PREFIX + email, code, 5, TimeUnit.MINUTES);
        mailService.sendMail(email, code);
    }
}
```

**新增 `LIMIT_PREFIX`**：给防刷的 Key 专门设定一个前缀，和验证码区分开。

**前置防刷校验**：将防刷判断放在了查数据库（`userMapper.selectByEmail`）的**前面**。这样做的好处是，如果有人恶意疯狂刷接口，请求在 Redis 这一层就被拦截抛出异常了，**不会去频繁查询数据库**，保护了数据库的性能。

**结合你的 `BusinessException`**：当 `setIfAbsent` 返回 `false` 时，直接抛出 `new BusinessException(429, "...")`。只要你配置了 `@RestControllerAdvice` 全局异常处理器，前端就能无缝接收到这个规范的报错信息。



现在当用户在前端点击“发送验证码”时，系统内部的流转如下：

1. **主线程接收请求**：进入 `sendCode` 方法。
2. **防刷校验**：通过 Redis 的 `setIfAbsent` 瞬间完成校验。如果没过，直接响应给前端 `429` 状态码（耗时 < 5ms）。
3. **缓存验证码**：将验证码写入 Redis（耗时 < 5ms）。
4. **触发异步**：主线程将发送邮件的任务丢进 `mailExecutor` 线程池的队列中，**自己立刻抽身**向前端响应“验证码已发送”（主线程总耗时不超过 20ms）。
5. **后台发送**：线程池中的小弟（后台线程）默默地去连接 SMTP 服务器、发送邮件。即使网络波动卡了 3 秒，也完全不影响主线程和用户的操作体验。