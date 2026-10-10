---
title: 5.异常处理
description: 一.全局异常处理器作用：当项目任何地方抛出异常时，都会被这个处理器捕获，然后返回统一的格式（比如JSON）好处：-不用在每个方法里写try-catch-返回格式统一，前端好处理-代码更干净怎么样定义全
pubDate: 2026-10-10
series: SpringBoot
order: 5
source: SpringBoot/5.异常处理
---

## 一.全局异常处理器

**作用**：当项目任何地方抛出异常时，都会被这个处理器捕获，然后返回统一的格式（比如JSON）

**好处**：

- 不用在每个方法里写try-catch
- 返回格式统一，前端好处理
- 代码更干净

怎么样定义全局异常处理器？

- 定义全局异常处理器非常简单，就是定义一个类，放在exception包下，在类上加上一个注解**@RestControllerAdvice**，加上这个注解就代表我们定义了一个全局异常处理器。
- 在全局异常处理器当中，需要定义一个方法来捕获异常，在这个方法上需要加上注解**@ExceptionHandler**。通过@ExceptionHandler注解当中的value属性来指定我们要捕获的是哪一类型的异常。

```Java
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    //处理异常
    @ExceptionHandler
    public Result ex(Exception e){//方法形参中指定能够处理的异常类型
        e.printStackTrace();//打印堆栈中的异常信息
        //捕获到异常之后，响应一个标准的Result
        return Result.error("对不起,操作失败,请联系管理员");
    }
}
```

@RestControllerAdvice = @ControllerAdvice + @ResponseBody

处理异常的方法返回值会转换为json后再响应给前端

以上就是全局异常处理器的使用，主要涉及到两个注解：

- **@RestControllerAdvice**  //表示当前类为全局异常处理器
- **@ExceptionHandler**  //指定可以捕获哪种类型的异常进行处理



## 二.代码实例

在没有全局异常处理的时候，我们的 Controller 里往往充斥着大量的 `try-catch` 和 `if-else`，代码又臭又长。**企业级规范的全局异常处理器的核心思想是：Controller 和 Service 层只管跑正常的业务逻辑，遇到任何不对劲的地方，直接 `throw Exception` 抛出去，由全局异常处理器在最外层统一“兜底”并包装成 `Result` 返回给前端。**

下面我为你提供一套可以直接在生产环境使用的标准模板，分为两步：

### 1.自定义业务异常类 (`BusinessException`)

为了区分“系统真的崩溃了（如数据库断连、空指针）”和“业务逻辑不符合预期（如密码错误、余额不足）”，我们需要定义一个专属的业务异常类。

在 `common/exception` 包下新建 `BusinessException.java`：

```java
/**
 * 自定义业务异常
 */
@Getter
public class BusinessException extends RuntimeException {

    private final Integer code;
    private final String message;

    // 方式1：只传入提示信息（默认使用 500 状态码）
    public BusinessException(String message) {
        super(message);
        this.code = ResultCode.ERROR.getCode();
        this.message = message;
    }

    // 方式2：使用提前定义好的枚举
    public BusinessException(ResultCode resultCode) {
        super(resultCode.getMessage());
        this.code = resultCode.getCode();
        this.message = resultCode.getMessage();
    }

    // 方式3：同时传入自定义状态码和提示信息
    public BusinessException(Integer code, String message) {
        super(message);
        this.code = code;
        this.message = message;
    }
}
```

### 第二步：编写全局异常处理器 (`GlobalExceptionHandler`)

利用 Spring 提供的 `@RestControllerAdvice` 注解，我们可以非常优雅地拦截所有抛出到 Controller 层的异常。

在 `common/exception` 包下新建 `GlobalExceptionHandler.java`：

```java
package com.example.common.exception;

import com.example.common.api.Result;
import com.example.common.api.ResultCode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import jakarta.servlet.http.HttpServletRequest;

/**
 * 全局异常处理器
 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

     // 处理自定义业务异常 (BusinessException)
    @ExceptionHandler(BusinessException.class)
    public Result<Void> handleBusinessException(BusinessException e, HttpServletRequest request) {
        // 业务异常通常是预期的，所以打个 INFO 或 WARN 级别的日志即可，记录一下请求路径
        log.warn("业务异常拦截 [URI: {}] - 异常原因: {}", request.getRequestURI(), e.getMessage());
        return Result.error(e.getCode(), e.getMessage());
    }

     /**
     * 处理 JSON 实体对象参数校验异常 (MethodArgumentNotValidException)
     * 场景: 当前端传递的 JSON 参数无法通过 @Valid 或 @Validated 校验时 (比如 @NotBlank, @NotNull) , 会抛出此异常
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public Result<Void> handleValidationException(MethodArgumentNotValidException e, HttpServletRequest request) {
        BindingResult bindingResult = e.getBindingResult();
        StringBuilder errorMsg = new StringBuilder();

        // 拼接所有字段的校验错误信息
        for (FieldError fieldError : bindingResult.getFieldErrors()) {
            errorMsg.append(fieldError.getDefaultMessage()).append("; ");
        }

        log.warn("参数校验异常拦截 [URI: {}] - 异常原因: {}", request.getRequestURI(), errorMsg.toString());
        // 返回 PARAM_ERROR (400) 状态码和拼接好的错误信息
        return Result.error(ResultCode.PARAM_ERROR.getCode(), errorMsg.toString());
    }

    /**
     * 处理单个参数校验异常 (ConstraintViolationException)
     * 场景: 当前端传递的单个参数 (Query参数或路径参数) 无法通过类上的 @Validated 校验时 , 会抛出此异常
     */
    @ExceptionHandler(ConstraintViolationException.class)
    public Result<Void> handleConstraintViolationException(ConstraintViolationException e, HttpServletRequest request) {
        StringBuilder errorMsg = new StringBuilder();

        // 拼接所有参数的校验错误信息
        for (ConstraintViolation<?> violation : e.getConstraintViolations()) {
           errorMsg.append(violation.getMessage()).append("; ");
        }

        log.warn("单个参数校验异常拦截 [URI: {}] - 异常原因: {}", request.getRequestURI(), errorMsg.toString());
        // 返回 PARAM_ERROR (400) 状态码和拼接好的错误信息
        return Result.error(ResultCode.PARAM_ERROR.getCode(), errorMsg.toString());
    }
    /**
     * 兜底处理：处理所有未知的系统异常 (Exception)
     * 场景：比如 NullPointerException, SQLSyntaxErrorException 等没被捕获的异常
     */
    @ExceptionHandler(Exception.class)
    public Result<Void> handleException(Exception e, HttpServletRequest request) {
        // 系统内部未知异常，必须打 ERROR 级别的日志，并且输出完整堆栈信息方便排查！
        log.error("系统未知异常拦截 [URI: {}]", request.getRequestURI(), e);
        
        // 绝对不要把 e.getMessage() 直接返回给前端，因为可能包含数据库账号密码或 SQL 结构信息，极度危险！
        // 统一返回系统内部异常提示
        return Result.error(ResultCode.ERROR); 
    }
}
```

*(补充说明：如果你的 `Result` 类里没有 `Result.error(code, message)` 方法，你可以补上一个，或者使用 `Result.success/error` 的灵活变体。)*

**感受一下前后的代码反差**

**以前的 Controller（没有全局异常处理）：**

```java
@PostMapping("/login")
public Result<String> login(@RequestBody LoginDTO dto) {
    try {
        if (dto.getUsername() == null) {
            return Result.error("用户名不能为空");
        }
        String token = authService.login(dto);
        if (token == null) {
            return Result.error("账号或密码错误");
        }
        return Result.success("登录成功", token);
    } catch (Exception e) {
        log.error("登录异常", e);
        return Result.error("系统故障，请稍后再试");
    }
}
```

**现在的 Controller + Service（有了全局异常处理 + 参数校验注解）：**

```java
// --- Controller 层 ---
@PostMapping("/login")
// 加上 @Validated 开启参数校验，异常会被 handleValidationException 拦截
public Result<String> login(@Validated @RequestBody LoginDTO dto) { 
    // 直接调业务，不写一行 if-else 和 try-catch
    String token = authService.login(dto);
    return Result.success("登录成功", token);
}

// --- Service 层 ---
public String login(LoginDTO dto) {
    User user = userMapper.findByUsername(dto.getUsername());
    if (user == null || !passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
        // 不满足业务条件？直接往外抛！会被 handleBusinessException 拦截
        throw new BusinessException("账号或密码错误"); 
    }
    return jwtUtil.generateToken(user);
}
```



## 三.BusinessException

别担心，这个概念刚接触时确实有点绕，很多人第一次接触企业级架构时都会在这里卡一下。我们抛开枯燥的理论，用**大白话**和**真实场景**来拆解它。

### 1. 定义

在 Java 原生的世界里，异常通常代表“代码出 bug 了”，比如：

- 空指针异常 (`NullPointerException`)
- 数组越界 (`IndexOutOfBoundsException`)

但在实际做项目时，很多时候**代码没出 bug，而是用户的操作不符合“业务规则”**，比如：

- 用户输入的密码错误。
- 用户想买东西，但商品库存不足。
- 用户的余额不够扣款。

Java 自带的异常里，可没有叫 `PasswordWrongException` 或者 `NoMoneyException` 的东西。所以，我们需要**自己造一个异常**，专门用来表示这种“业务逻辑上的错误”，这就是 `BusinessException` 的由来。

### 2. 为什么要这么写

为了让你秒懂，我们对比一下“新手写法”**和**“企业级写法”。

**❌ 新手写法（没有 BusinessException 时）：**

当你在 Service 层（业务逻辑层）发现密码错误时，为了把错误信息传给前端，你不得不让 Service 层也返回 `Result` 对象。

```java
// Service 层
public Result login(String username, String password) {
    if (密码错误) {
        return Result.error("密码错误"); // Service 层跟 Result 绑死了，很丑陋
    }
    return Result.success(token);
}

// Controller 层
public Result loginController(...) {
    return userService.login(username, password);
}
```

**✅ 企业级写法（有了 BusinessException 后）：**

Service 层只管返回干净的数据（比如 Token），一旦发现不符合业务规则，**直接像扔炸弹一样，把 `BusinessException` 扔出去（`throw`）！**

```java
// Service 层 (极其干净，只返回 String 类型的 token)
public String login(String username, String password) {
    if (密码错误) {
        // 遇到问题，直接抛出我们自定义的异常！
        throw new BusinessException("密码错误，请重新输入"); 
    }
    return token;
}
```

**炸弹扔出去谁来接？** 就是我们上一步写的 **全局异常处理器 (`GlobalExceptionHandler`)**！它会在最外层接住这个 `BusinessException`，然后自动把它打包成 `Result.error("密码错误，请重新输入")` 返回给前端。



### 3. 具体怎么用

#### 姿势一：只传提示信息

当你只是想给前端弹出一个简单的文字提示，不需要特定的状态码时。

- **场景**：用户注册时，发现用户名已经被别人用了。
- **用法**：

```java
public void register(User user) {
    if (userMapper.selectByUsername(user.getUsername()) != null) {
        // 发现用户名已存在，直接中断程序并抛出异常
        throw new BusinessException("该用户名已经被注册了，换一个吧！");
    }
    // 如果上面抛了异常，这行插入数据库的代码就不会执行了（安全！）
    userMapper.insert(user); 
}
```

*(全局异常处理器收到后，会默认给前端返回：`{"code": 500, "message": "该用户名已经被注册了，换一个吧！", "data": null}`)*

#### 姿势二：使用枚举类

当这个错误非常明确，前端需要根据特定的 `code` 做跳转时（比如没登录要跳登录页）。

- **场景**：用户想查看个人中心，但后端的拦截器发现他根本没登录（或者 Token 过期了）。
- **用法**：

```java
public void checkLogin(String token) {
    if (token == null || token.isEmpty()) {
        // 抛出带有特定错误码的异常（假设 UNAUTHORIZED 的 code 是 401）
        throw new BusinessException(ResultCode.UNAUTHORIZED); 
    }
}
```

*(全局异常处理器收到后，会给前端返回：`{"code": 401, "message": "暂未登录或token已经过期", "data": null}`)*



你可以把 `BusinessException` 想象成业务代码里的“火警报警器”**。 在 Service 层的任何地方，只要你觉得业务走不下去了（比如钱不够、密码错、查不到数据），\**不要去写复杂的 return，直接 `throw new BusinessException("失败原因")` 砸响报警器。\** 外层的全局异常处理器听到报警，就会自动帮你收拾烂摊子，给前端返回格式统一的 JSON 报错。这就叫**“优雅”！
