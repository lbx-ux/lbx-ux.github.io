---
title: 2.JWT令牌
description: JWT全称JSONWebToken（官网：https://jwt.io/），定义了一种简洁的、自包含的格式，用于在通信双方以json数据格式安全的传输信息。由于数字签名的存在，这些信息是可靠的。
pubDate: 2026-08-25
series: 登录技术
order: 2
source: 实战/登录技术/1.JWT令牌.md
---

## 一.JWT令牌

JWT全称 JSON Web Token  （官网：https://jwt.io/），定义了一种简洁的、自包含的格式，用于在通信双方以json数据格式安全的传输信息。由于数字签名的存在，这些信息是可靠的。

* 简洁：是指jwt就是一个简单的字符串。可以在请求参数或者是请求头当中直接传递。

* 自包含：指的是jwt令牌，看似是一个随机的字符串，但是我们是可以根据自身的需求在jwt令牌中存储自定义的数据内容。如：可以直接在jwt令牌中存储用户的相关信息。

* 简单来讲，jwt就是将原始的json数据格式进行了安全的封装，这样就可以直接基于jwt在通信双方安全的进行信息传输了。



JWT令牌最典型的应用场景就是登录认证：

1. 在浏览器发起请求来执行登录操作，此时会访问登录的接口，如果登录成功之后，我们需要生成一个jwt令牌，将生成的 jwt令牌返回给前端。

2. 前端拿到jwt令牌之后，会将jwt令牌存储起来。在后续的每一次请求中都会将jwt令牌携带到服务端。

3) 服务端统一拦截请求之后，先来判断一下这次请求有没有把令牌带过来，如果没有带过来，直接拒绝访问，如果带过来了，还要校验一下令牌是否是有效。如果有效，就直接放行进行请求的处理。

![image-20260330165052917](/covers/1-jwt-45wl1e/image-20260330165052917.webp)

在JWT登录认证的场景中我们发现，整个流程当中涉及到两步操作：

1. 在登录成功之后，要生成令牌。

2. 每一次请求当中，要接收令牌并对令牌进行校验。

<img src="/covers/1-jwt-45wl1e/image-20260330165955822.webp" alt="image-20260330165955822" style="zoom:150%;" />

JWT的组成： （JWT令牌由三个部分组成，三个部分之间使用英文的点来分割）

* 第一部分：Header(头）， 记录令牌类型、签名算法等。 例如：{"alg":"HS256","type":"JWT"}

* 第二部分：Payload(有效载荷），携带一些自定义信息、默认信息等。 例如：{"id":"1","username":"Tom"}

* 第三部分：Signature(签名），防止Token被篡改、确保安全性。将header、payload，并加入指定秘钥，通过指定签名算法计算而来。

> 签名的目的就是为了防jwt令牌被篡改，而正是因为jwt令牌最后一个部分数字签名的存在，所以整个jwt 令牌是非常安全可靠的。一旦jwt令牌当中任何一个部分、任何一个字符被篡改了，整个令牌在校验的时候都会失败，所以它是非常安全可靠的。

JWT是如何将原始的JSON格式数据，转变为字符串的呢？

* 其实在生成JWT令牌时，会对JSON格式的数据进行一次编码：进行base64编码

* Base64：是一种基于64个可打印的字符来表示二进制数据的编码方式。既然能编码，那也就意味着也能解码。所使用的64个字符分别是A到Z、a到z、 0- 9，一个加号，一个斜杠，加起来就是64个字符。任何数据经过base64编码之后，最终就会通过这64个字符来表示。当然还有一个符号，那就是等号。等号它是一个补位的符号

* 需要注意的是Base64是编码方式，而不是加密方式。



## 二.JWT令牌实现

### 1.引入依赖

```xml
<!-- 升级后的新版本jjwt，适配SpringBoot3/Jakarta -->
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
```



### 2.在yml文件配置JWT令牌内容

在 `0.12.x` 版本中，JJWT 引入了严格的安全校验机制。对于最基础的 HS256 签名算法，**强制要求密钥长度至少为 256 位（即 32 个英文字符）**

```yml
jwt:
   # 设置jwt签名加密时使用的秘钥
   secret-key: fjqThisIsAVerySecureAndLongSecretKey
   # 设置jwt过期时间 2个小时
   ttl: 7200000
   # 设置前端传递过来的令牌名称
   token-name: token
```



### 3.创建JwtProperties接收配置

在sky-commmon-propertiess创建JwtProperties类

```java
@Component
@ConfigurationProperties(prefix = "jwt")
@Data
public class JwtProperties {
    /**
     * 管理端员工生成jwt令牌相关配置
     */
    private String secretKey;
    private long ttl;
    private String tokenName;

}
```



### 4.创建JwtUtil工具类

这个工具类负责两件事：**生成 Token** 和 **解析/校验 Token**

```java
@Component
public class JwtUtil {

    // 1. 注入你写好的配置实体类
    @Autowired
    private JwtProperties jwtProperties;

    // 真正的安全密钥对象
    private SecretKey key;

    @PostConstruct
    public void init() {
        // 2. 从配置类中获取密钥字符串进行初始化
        String secretString = jwtProperties.getSecretKey();
        this.key = Keys.hmacShaKeyFor(secretString.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * 生成 JWT Token
     */
    public String createJWT(Map<String, Object> claims) {
        long nowMillis = System.currentTimeMillis();
        Date now = new Date(nowMillis);
        
        // 3. 从配置类中获取过期时间
        Date exp = new Date(nowMillis + jwtProperties.getTtl());

        return Jwts.builder()
                .claims(claims)
                .issuedAt(now)
                .expiration(exp)
                .signWith(key)
                .compact();
    }

    /**
     * 解析/校验 JWT Token
     */
    public Claims parseJWT(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
```



```java
// 真正的安全密钥对象
    private SecretKey key;

    @PostConstruct
    public void init() {
        // 2. 从配置类中获取密钥字符串进行初始化
        String secretString = jwtProperties.getSecretKey();
        this.key = Keys.hmacShaKeyFor(secretString.getBytes(StandardCharsets.UTF_8));
    }
```

1. **`@PostConstruct` 的玄机（为什么要用这个注解？）**

在 Spring Boot 中，一个类（Bean）的创建过程是这样的：

1. **实例化**：先执行普通的构造方法 `public JwtUtil()`。
2. **依赖注入**：把带有 `@Autowired` 的东西塞进去（比如你的 `jwtProperties`）。
3. **初始化**：执行带有 `@PostConstruct` 注解的方法。

**如果不加这个注解会怎样？** 如果你把这两行代码直接写在普通的构造方法里，代码运行的时候 `jwtProperties` 还没有被 Spring 注入进来（它是 null），直接调用 `.getSecretKey()` 就会报出可怕的空指针异常（`NullPointerException`）。所以，`@PostConstruct` 的意思就是告诉 Spring：“**等兄弟们（依赖）都到位了，你再执行我这段逻辑。**”

2. `String secretString = ...`

这一步很简单，就是把你之前在 `application.yml` 里写的那个很长的密钥（例如 `fjqThisIsAVerySecureAndLongSecretKey`），通过你刚写好的 `JwtProperties` 实体类读取出来，暂存在 `secretString` 变量里。

3. `**Keys.hmacShaKeyFor(...)`（核心加密逻辑）**

新版 JJWT（0.12.x）对安全性要求极高。它在生成和解析 Token 时，**不接受普通的 String 字符串**，它只认标准的、经过密码学处理的 `SecretKey` 对象。

- `secretString.getBytes(StandardCharsets.UTF_8)`：先把你的字符串打碎成 UTF-8 格式的字节数组（byte[]）。
- `Keys.hmacShaKeyFor(...)`：JJWT 提供的安全工具类，它会拿这堆字节数组，为你打造一把专用于 HMAC-SHA 算法的“数字加密钥匙”，并赋值给全局变量 `this.key`。



```java
Map<String, Object> claims
```

`claims` 里只放**无敏感性的标识信息**（比如用户 ID、账号名、权限角色）。后端拦截器拿到 Token 后，解析出用户 ID，就已经足够确认“这个人是谁”了。

在 JWT 的世界里，`claims`（中文通常翻译为“声明”**或**“载荷”**）就是**你想在 Token 里携带的具体数据。

而 `Map<String, Object>` 是 Java 中用来存储这些数据的数据结构。我们可以把它拆开来理解：

1. **为什么叫 claims？**

JWT 生成的字符串通常由三部分组成，中间的那一部分就是 Payload（载荷）。在官方标准中，载荷里面的一条条数据就被称为一个 claim（声明）。

比如：“我声明这个用户的 ID 是 1”、“我声明这个用户的角色是管理员”。

**2. 为什么用 `Map<String, Object>`？**

因为 JWT 的本质是一段 JSON 数据，而 JSON 的结构就是**键值对**。Java 中的 `Map` 完美对应了这种结构：

- **`String` (键)**：数据的名字，比如 `"userId"`, `"username"`, `"role"`。
- **`Object` (值)**：具体的数据内容。用 `Object` 是因为你的数据类型可能不一样：ID 可能是 `Long` 类型，名字是 `String` 类型，状态可能是 `Boolean` 类型。用 `Object` 就能包容所有的类型。



假设在一个类似公寓管理的系统中，用户登录成功后，你想把他的**用户 ID** 和**用户名**塞进 Token 里，让前端以后每次发请求都带着。

**你在 Controller 里是这样“塞”数据的：**

```java
// 1. 创建一个 Map 集合来装你的 claims
Map<String, Object> claims = new HashMap<>();

// 2. 往里面放数据
claims.put("userId", 10086L);       // Long 类型
claims.put("username", "admin");    // String 类型

// 3. 把这个 Map 传给 JwtUtil，生成 Token
String token = jwtUtil.createJWT(claims);
```

**JJWT 在底层会把这个 Map 变成类似这样的 JSON 存进 Token 里：**

```java
{
  "userId": 10086,
  "username": "admin",
  "exp": 1716380000 // 这个是过期时间，JJWT 会自动帮你加进去
}
```

**将来在拦截器（Interceptor）里，你又是这样把数据“取”出来的：**

```java
// 1. 解析 Token 拿到 claims
Claims parsedClaims = jwtUtil.parseJWT(token);

// 2. 根据键名，把你需要的数据取出来
Long userId = parsedClaims.get("userId", Long.class);
String username = parsedClaims.get("username", String.class);
```



### 5.创建EmployeeLoginDTO类

前端通常会传用户名和密码过来，我们封装成 DTO。

```java
@Data
public class EmployeeLoginDTO {
    private String username;
    private String password;
}
```



### 6.创建employeeLoginVO类

登录成功后，除了返回 Token，通常还需要把用户的 ID、姓名等基本信息一起返回给前端（如 Vue 3），方便前端展示。

```java
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeLoginVO  {
    private Long id;
    private String userName;
    private String name;
    private String token;
}
```



### 6.Controller层

```java
@RestController
@RequestMapping("/admin/employee")
public class EmployeeController {
    @Autowired
    private EmployeeService employeeService;
    @Autowired
    private JwtUtil jwtUtil;

    @PostMapping("/login")
    public Result<EmployeeLoginVO> login(@RequestBody EmployeeLoginDTO loginDTO) {
        
        // 1. 调用 Service 层进行核心的登录业务处理（查库、校验密码）
        // 如果校验失败，Service 内部会直接抛出异常，这里不需要写 if-else
        Employee employee = employeeService.login(loginDTO);

        // 2. 代码能走到这里，说明账号密码绝对正确。准备 claims 数据。
        Map<String, Object> claims = new HashMap<>();
        claims.put("empId", employee.getId()); 

        // 3. 发放 Token
        String token = jwtUtil.createJWT(claims);

        // 4. 组装返回给前端的 VO 对象
        EmployeeLoginVO loginVO = new EmployeeLoginVO(
                employee.getId(),
                employee.getUsername(),
                employee.getName(),
                token
        );

        return Result.success(loginVO);
    }
}
```



### 7.Service层

在 Service 里，我们会调用 Mapper（或 MyBatis-Plus 的方法）去查询数据库。

**Service 接口 (`EmployeeService.java`)**：

```java
public interface EmployeeService {
    /**
     * 员工登录
     */
    Employee login(EmployeeLoginDTO employeeLoginDTO);
}
```

**Service 实现类 (`EmployeeServiceImpl.java`)**：

```java
@Service
public class EmployeeServiceImpl implements EmployeeService {
    @Autowired
    private EmployeeMapper employeeMapper;
    @Override
    public Employee login(EmployeeLoginDTO employeeLoginDTO) {
        String username = employeeLoginDTO.getUsername();
        String password = employeeLoginDTO.getPassword();

        // 1. 根据用户名查询数据库中的员工数据
        // 假设你在 Mapper 里写了 getByUsername 方法，或者用 MyBatis-Plus 的 getOne(queryWrapper)
        Employee employee = employeeMapper.getByUsername(username);

        // 2. 处理各种异常情况
        if (employee == null) {
            // 账号不存在
            throw new BusinessException("账号不存在"); // 实际开发中建议抛出自定义异常，如 AccountNotFoundException
        }

        // 3. 密码比对
        // 通常数据库里的密码是经过 MD5 加密的，所以要把前端传过来的明文密码也加密一次再比对
        String passwordMd5 = DigestUtils.md5DigestAsHex(password.getBytes());
        if (!passwordMd5.equals(employee.getPassword())) {
            // 密码错误
            throw new BusinessException("密码错误");
        }

        // 4. 账号状态校验 (假设数据库里有个 status 字段，1表示正常，0表示禁用)
        if (employee.getStatus() == 0) {
            throw new BusinessException("账号已被锁定，请联系管理员");
        }

        // 5. 所有校验通过，返回数据库中真实的员工对象
        return employee;
    }
}
```



### 8.Token 拦截器

#### 实现方式一：

在标准的 Spring Boot 企业级架构中，拦截器的实现包含两个核心部分：

1. **编写拦截器类**：承载具体的 Token 提取、解析、上下文存储以及拦截拦截逻辑。
2. **编写配置类**：将拦截器注册到 Spring MVC 容器中，并配置精准的拦截与放行路径。

**第一步：编写 Token 拦截器 (`JwtTokenAdminInterceptor.java`)**

在这个拦截器中，将直接注入配置类 `JwtProperties` 来动态获取前端传递的请求头名称，避免硬编码。同时，在 Token 校验通过后，将解析出的员工 ID 存入 `request` 域（或者更高级的 `ThreadLocal` 上下文）中。

```java
/**
 * JWT 令牌拦截器
 */
@Component
public class JwtTokenAdminInterceptor implements HandlerInterceptor {
    @Autowired
    private JwtUtil jwtUtil;
    @Autowired
    private JwtProperties jwtProperties;

    /**
     * 在请求到达 Controller 之前进行拦截校验
     */
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // 1. 判断当前拦截到的是否为 Controller 的动态方法
        if (!(handler instanceof HandlerMethod)) {
            // 如果拦截到的是静态资源（如 html, css, js 等），直接放行
            return true;
        }

        // 2. 从请求头中动态获取令牌（名称由 yml 中的 token-name 决定）
        String tokenName = jwtProperties.getTokenName();
        String token = request.getHeader(tokenName);

        // 3. 校验令牌
        try {
            // 调用 0.12.x 版本的解析方法，如果过期或被篡改，此处会直接抛出异常
            Claims claims = jwtUtil.parseJWT(token);       
            // 从载荷中提取出登录时存入的员工ID
            Long empId = claims.get("empId", Long.class);          
            // 💡 重点 将解析出的 ID 存入当前线程的 ThreadLocal 中
            BaseContext.setCurrentId(empId);
            // 5. 校验通过，放行请求
            return true;
            
        } catch (Exception ex) {
            // 6. 校验失败，打断请求，向前端响应 401 状态码与标准错误 JSON
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            
            // 返回标准失败响应体格式
            response.getWriter().write("{\"code\":401, \"message\":\"未登录或Token已失效，请重新登录\"}");
            return false;
        }
    }
    
    /**
     * 💡 重点 ：请求处理完毕后（无论是正常返回还是抛出异常），必须执行 remove！
     */
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        // 清理当前线程的 ThreadLocal 数据
        BaseContext.removeCurrentId();
    }
}
```

**第二步：注册拦截器并配置规则 (`WebMvcConfiguration.java`)**

编写配置类实现 `WebMvcConfigurer` 接口，把写好的拦截器添加进去。在这里需要特别注意：**登录接口必须要手动放行（excludePathPatterns），否则会陷入“不登录拿不到 Token -> 没有 Token 无法访问登录接口”的死循环。**

```java
/**
 * Web MVC 配置类
 */
@Configuration
public class WebMvcConfiguration implements WebMvcConfigurer {

    @Autowired
    private JwtTokenAdminInterceptor jwtTokenAdminInterceptor;

    /**
     * 注册自定义拦截器
     */
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(jwtTokenAdminInterceptor)
                .addPathPatterns("/admin/**")          // 拦截管理端所有的接口请求
                .excludePathPatterns(                  // 明确放行以下接口
                        "/admin/employee/login",       // 放行员工登录接口
                        "/admin/employee/register"     // 放行员工注册接口（如果有的话）
                );
    }
}
```



#### 实现方式二:Security

适合项目中有SpringSecurity

**1. 编写 JwtAuthenticationFilter**

新建一个类继承 `OncePerRequestFilter`，你可以把它当作升级版的 `Interceptor`。

```java
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    // 直接注入你原有的工具类和配置属性
    private final JwtUtil jwtUtil;
    private final JwtProperties jwtProperties;

    @Override
    protected void doFilterInternal( HttpServletRequest request,HttpServletResponse response,FilterChain filterChain) throws ServletException, IOException {
        // 1. 从请求头中动态获取令牌
        String tokenName = jwtProperties.getTokenName();
        String token = request.getHeader(tokenName);
        
        // 2. 如果请求头中没有 Token，直接放行
        // 【注意】这里放行不代表安全验证通过！
        // 因为如果是去登录接口，本来就没 Token，需要放行；
        // 如果是去受保护的接口没带 Token，放行后，后面的 Spring Security 机制会拦截并报错。
        if (!StringUtils.hasText(token)) {
            filterChain.doFilter(request, response);
            return;
        }

        // 3. 校验令牌
        try {
            // 调用你原有的解析方法
            Claims claims = jwtUtil.parseJWT(token);
            String email = claims.get("email", String.class);

            // 4. 【新增】将用户信息告知 Spring Security
            // 如果解析成功，且 Spring Security 上下文中还没有认证信息
            if (email != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                // 生成一个认证 Token (代表该用户已合法登录)
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        email, // 存入用户的 email 作为身份标识
                        null,  // 凭证(密码)为 null，因为 JWT 已经证明了身份
                        Collections.emptyList() // 权限列表暂为空
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                // 将认证信息存入 Security 上下文
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }

            // 5. 【保留】兼容你原有的 ThreadLocal
            // 这样你之前在 Controller 里用 BaseContext.getCurrent() 的代码就完全不用改了！
            BaseContext.setCurrent(email);

            // 6. 校验通过，放行请求，进入 Controller
            filterChain.doFilter(request, response);

        } catch (Exception ex) {
            // 7. 【保留】校验失败，直接拦截并响应 401 状态码和 JSON 错误信息
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"code\":401, \"message\":\"未登录或Token已失效，请重新登录\"}");
            // return 结束方法，不会调用 filterChain.doFilter，请求被彻底拦截
            return;
            
        } finally {
            // 8. 【保留】清理 ThreadLocal 数据
            // 这里的 finally 块等价于你原本在 Interceptor 里的 afterCompletion 方法。
            // 当请求执行完 Controller 准备返回给前端时，一定会执行这里，防止内存泄漏。
            BaseContext.removeCurrent();
        }
    }
}
```

**改造细节对比:**

1. **去掉了 `instanceof HandlerMethod` 判断**：

   在 Spring MVC 拦截器里，请求已经经过了路由，所以你需要判断拦截到的是不是静态资源。而在 Spring Security 的 Filter 层级，请求还没到路由分发阶段。针对静态资源的放行，我们现在统一在 `SecurityConfig` 里面配置，Filter 里只专注于 Token 的解析即可。

2. **新增了 `SecurityContextHolder.getContext().setAuthentication(...)`**：

   这就是 Spring Security 的“通行证”。有了这句话，Spring Security 才知道这个请求对应的是哪个合法用户。

3. **保留了 `BaseContext` 和 401 报错**：

   这样做的最大好处是**对你已有的业务代码零侵入**。你 Controller 里怎么获取当前登录用户，以前怎么写现在还怎么写，前端接收到的过期错误格式也跟以前一模一样。

4. **`afterCompletion` 变成了 `finally`**：

   `filterChain.doFilter` 这一句其实就是去执行后续的 Controller。用 `try-finally` 把这句包起来，就能完美平替拦截器的 `afterCompletion` 功能。

**把它加到配置类里**

写完上面的 Filter 后，回到 `SecurityConfig.java`，把这个过滤器“安插”进去就行了

```java
@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    // 1. 注入我们刚写好的过滤器
    private final JwtAuthenticationFilter jwtAuthFilter;

    // ... 省略 passwordEncoder 配置 ...

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            // 禁用 Session
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
               .requestMatchers(
                    "/api/v1/auth/login", 
                   "/api/v1/auth/register", 
                 "/api/v1/auth/send-code"
                     ).permitAll()
                .anyRequest().authenticated()
            )
            // 2. 把我们的 JWT 过滤器加到默认的用户密码认证过滤器之前
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
```

做完这两步，你就可以**直接删掉**你截图里的那个 `JwtTokenAdminInterceptor` 以及用来注册它的 `WebMvcConfiguration` 类了！整个项目的权限架构会变得非常清晰和专业。



### 9.ThreadLocal

前端发来一个请求，这个请求经过了 **Controller -> Service -> Mapper**。

此时，Mapper 层的某个 SQL 语句需要自动填入 `create_user`（创建人 ID），而这个 ID 只有在最开始的**拦截器**里解析 Token 时才知道。

**传统做法（很笨重）：**

把 `empId` 作为参数，一路往下传：

`controller(empId)` -> `service(empId)` -> `mapper(empId)`

如果每个接口都这么干，你的所有方法签名里都要多一个 `empId`，代码会非常臃肿（这叫“参数污染”）。

**优雅做法（ThreadLocal）：**

Spring 默认是**单例多线程**的。也就是说，每一次 HTTP 请求进来，Tomcat 服务器都会分配一个独立的线程（Thread）来专门处理这个请求，从拦截器到 Controller 再到 Mapper，都是这同一个线程在跑。

`ThreadLocal` 就是 Java 提供的一个“线程专属储物柜”。

- **拦截器**就像大门口的保安，他查验完 Token，把员工 ID 放进这个线程的储物柜里。
- **Controller / Service / Mapper** 就像里面的办事员，谁需要这个员工 ID，直接打开储物柜拿就行了，**完全不需要互相传递参数**。
- 并且，不同请求的线程拥有完全隔离的储物柜，绝对不会发生“张三拿到了李四的 ID”这种事。



**第一步：编写 `BaseContext` 工具类**

这个类相当于对 `ThreadLocal` 的一层简单封装，专门用来存取员工 ID。建议放在 `com.rentify.context` 包下。

```java
package com.rentify.context;

public class BaseContext {

    // 泛型定义为 Long，因为我们存的是员工 ID
    private static ThreadLocal<Long> threadLocal = new ThreadLocal<>();

    /**
     * 存入数据
     */
    public static void setCurrentId(Long id) {
        threadLocal.set(id);
    }

    /**
     * 获取数据
     */
    public static Long getCurrentId() {
        return threadLocal.get();
    }

    /**
     * 移除数据 (极度重要，千万不能忘！)
     */
    public static void removeCurrentId() {
        threadLocal.remove();
    }
}
```

**第二步：在拦截器中“存”和“删”**

回到你刚才写的 `JwtTokenAdminInterceptor`，做两处修改：

1. 在 `preHandle` (校验通过后) 存入 ID。
2. 重写 `afterCompletion` 方法，在请求结束后删除 ID。

```java
@Component
public class JwtTokenAdminInterceptor implements HandlerInterceptor {
    
    // ... 前面的注入代码省略 ...

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        // ... 前面的 Token 解析代码省略 ...
        
        try {
            Claims claims = jwtUtil.parseJWT(token);
            Long empId = claims.get("empId", Long.class);
            
            // 💡 重点 1：将解析出的 ID 存入当前线程的 ThreadLocal 中
            BaseContext.setCurrentId(empId);
            
            return true;
        } catch (Exception ex) {
            // ... 失败处理省略 ...
        }
    }

    /**
     * 💡 重点 2：请求处理完毕后（无论是正常返回还是抛出异常），必须执行 remove！
     */
    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, Exception ex) throws Exception {
        // 清理当前线程的 ThreadLocal 数据
        BaseContext.removeCurrentId();
    }
}
```

**第三步：在任何地方“取”**

现在，不管是你的 Controller 还是 Service，只要你想知道当前是谁在操作，直接调 `BaseContext` 即可，不需要再从方法参数里接收了！

```java
@Service
public class EmployeeServiceImpl implements EmployeeService {
    
    public void updateEmployee(Employee employee) {
        // 任何需要用到当前操作人 ID 的地方，直接一行代码搞定！
        Long currentId = BaseContext.getCurrentId();
        
        employee.setUpdateTime(LocalDateTime.now());
        employee.setUpdateUser(currentId); // 自动填充修改人
        
        employeeMapper.update(employee);
    }
}
```



## 四.过滤器Filter

刚才通过浏览器的开发者工具，我们可以看到在后续的请求当中，都会在请求头中携带JWT令牌到服务端，而服务端需要统一拦截所有的请求，从而判断是否携带的有合法的JWT令牌

* Filter表示过滤器，是 JavaWeb三大组件(Servlet、Filter、Listener)之一。
* 过滤器可以把对资源的请求拦截下来，从而实现一些特殊的功能

  * 使用了过滤器之后，要想访问web服务器上的资源，必须先经过滤器，过滤器处理完毕之后，才可以访问对应的资源。
* 过滤器一般完成一些通用的操作，比如：登录校验、统一编码处理、敏感字符处理等

![image-20260330202711751](/covers/1-jwt-45wl1e/image-20260330202711751.webp)



下面我们通过Filter快速入门程序掌握过滤器的基本使用操作：

* 第1步，定义过滤器 ：定义一个类，实现 Filter 接口，并重写其所有方法。
* 第2步，配置过滤器：Filter类上加 @WebFilter 注解，配置拦截资源的路径。引导类上加 @ServletComponentScan 开启Servlet组件支持。

**1). 定义过滤器**

```java
@WebFilter(urlPatterns = "/*")
@Slf4j
public class DemoFilter implements Filter {
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        log.info("初始化方法运行了");
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        log.info("拦截到了请求");
        //放行
        filterChain.doFilter(servletRequest,servletResponse);
    }

    @Override
    public void destroy() {
        log.info("销毁方法执行了");
    }
}
```

> * init方法：过滤器的初始化方法。在web服务器启动的时候会自动的创建Filter过滤器对象，在创建过滤器对象的时候会自动调用init初始化方法，这个方法只会被调用一次。
>
> * doFilter方法：这个方法是在每一次拦截到请求之后都会被调用，所以这个方法是会被调用多次的，每拦截到一次请求就会调用一次doFilter()方法。
>
> * destroy方法： 是销毁的方法。当我们关闭服务器的时候，它会自动的调用销毁方法destroy，而这个销毁方法也只会被调用一次。



**2). 配置过滤器**

```java
@WebFilter(urlPatterns = "/*") //配置过滤器要拦截的请求路径（ /* 表示拦截浏览器的所有请求 ）
public class DemoFilter implements Filter {......}
```

在定义完Filter之后，Filter其实并不会生效，还需要完成Filter的配置，Filter的配置非常简单，只需要在Filter类上添加一个注解：`@WebFilter`，并指定属性`urlPatterns`，通过这个属性指定过滤器要拦截哪些请求

当我们在Filter类上面加了@WebFilter注解之后，接下来我们还需要在启动类上面加上一个注解`@ServletComponentScan`，通过这个`@ServletComponentScan`注解来开启SpringBoot项目对于Servlet组件的支持。

```java
@ServletComponentScan //开启对Servlet组件的支持
@SpringBootApplication
public class TliasManagementApplication {
    public static void main(String[] args) {
        SpringApplication.run(TliasManagementApplication.class, args);
    }
}
```

> *注意事项：**&#x5728;过滤器Filter中，如果不执行放行操作，将无法访问后面的资源。 放行操作：`filterChain.doFilter(servletRequest,servletResponse);`



**登录校验过滤器**

我们先来回顾下前面分析过的登录校验的基本流程：

* 要进入到后台管理系统，我们必须先完成登录操作，此时就需要访问登录接口login。

* 登录成功之后，我们会在服务端生成一个JWT令牌，并且把JWT令牌返回给前端，前端会将JWT令牌存储下来。

* 在后续的每一次请求当中，都会将JWT令牌携带到服务端，请求到达服务端之后，要想去访问对应的业务功能，此时我们必须先要校验令牌的有效性。

* 对于校验令牌的这一块操作，我们使用登录校验的过滤器，在过滤器当中来校验令牌的有效性。如果令牌是无效的，就响应一个错误的信息，也不会再去放行访问对应的资源了。如果令牌存在，并且它是有效的，此时就会放行去访问对应的web资源，执行相应的业务操作。



大概清楚了在Filter过滤器的实现步骤了，那在正式开发登录校验过滤器之前，我们思考两个问题：

1. 所有的请求，拦截到了之后，都需要校验令牌吗 ？

   * 答案：**登录请求例外**

2. 拦截到请求后，什么情况下才可以放行，执行业务操作 ？

   * 答案：**有令牌，且令牌校验通过(合法)；否则都返回未登录错误结果**



我们要完成登录校验，主要是利用Filter过滤器实现，而Filter过滤器的流程步骤：

![image-20260330204405255](/covers/1-jwt-45wl1e/image-20260330204405255.webp)

基于上面的业务流程，我们分析出具体的操作步骤：

1. 获取请求url

2. 判断请求url中是否包含login，如果包含，说明是登录操作，放行

3. 获取请求头中的令牌（token）

4. 判断令牌是否存在，如果不存在，响应 401

5. 解析token，如果解析失败，响应 401

6. 放行



在 `com.itheima.filter` 包下创建`TokenFilter`，具体代码如下：

```java
@Slf4j
@WebFilter(urlPatterns = "/*")
public class TokenFilter implements Filter {
    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;

        //1.获取请求路径
        String requestURI = request.getRequestURI();

        //2.是否是登录请求，如果路径中包含/login，说明是登录操作，放行
        if (requestURI.contains("/login")) {
            log.info("登录操作");
            filterChain.doFilter(request, response);
            return;
        }

        //3.获取请求头中的token
        String token = request.getHeader("token");

        //4.判断token是否存在，如果不存在，说明用户没有登录，返回错误信息（响应401状态码）
        if (token == null || token.isEmpty()) {
            log.info("令牌为空，响应401状态码");
            response.setStatus(401);
            return;
        }

        //5.如果token存在,校验令牌，如果校验失败，返回错误信息（响应401状态码）
        try {
            JwtUtils.parseJWT(token);
        } catch (Exception e) {
            log.info("令牌校验失败，响应401状态码");
            response.setStatus(401);
            return;
        }

        //6.如果校验成功，放行
            log.info("令牌校验成功，放行");
            filterChain.doFilter(request, response);

    }
}
```





**Filter详解**

Filter过滤器的快速入门程序我们已经完成了，接下来我们就要详细的介绍一下过滤器Filter在使用中的一些细节。主要介绍以下3个方面的细节：

1. 过滤器的执行流程

2. 过滤器的拦截路径配置

3) 过滤器链



**执行流程**

过滤器的执行流程：

![image-20260330211431291](/covers/1-jwt-45wl1e/image-20260330211431291.webp)

过滤器当中我们拦截到了请求之后，如果希望继续访问后面的web资源，就要执行放行操作，放行就是调用 FilterChain对象当中的doFilter()方法，在调用doFilter()这个方法之前所编写的代码属于放行之前的逻辑。

在放行后访问完 web 资源之后还会回到过滤器当中，回到过滤器之后如有需求还可以执行放行之后的逻辑，放行之后的逻辑我们写在doFilter()这行代码之后。





**拦截路径**

过滤器的拦截路径，Filter可以根据需求，配置不同的拦截资源路径：

|   拦截路径   | urlPatterns值 |               含义                |
| :----------: | :-----------: | :-------------------------------: |
| 拦截具体路径 |    /login     | 只有访问/login 路径时，才会被拦截 |
|   目录拦截   |    /emps/*    | 访问/emps下的所有资源，都会被拦截 |
|   拦截所有   |      /*       |     访问所有资源，都会被拦截      |



**过滤器链**

过滤器链指的是在一个web应用程序当中，可以配置多个过滤器，多个过滤器就形成了一个过滤器链。

![image-20260330212059003](/covers/1-jwt-45wl1e/image-20260330212059003.webp)

比如：在我们web服务器当中，定义了两个过滤器，这两个过滤器就形成了一个过滤器链。

而这个链上的过滤器在执行的时候会一个一个的执行，会先执行第一个Filter，放行之后再来执行第二个Filter，如果执行到了最后一个过滤器放行之后，才会访问对应的web资源。

访问完web资源之后，按照我们刚才所介绍的过滤器的执行流程，还会回到过滤器当中来执行过滤器放行后的逻辑，而在执行放行后的逻辑的时候，顺序是反着的。

先要执行过滤器2放行之后的逻辑，再来执行过滤器1放行之后的逻辑，最后在给浏览器响应数据。

> 过滤器链上过滤器的执行顺序：注解配置的Filter，优先级是按照过滤器类名（字符串）的自然排序。 比如：
>
> * AbcFilter
>
> * DemoFilter
>
> 这两个过滤器来说，AbcFilter 会先执行，DemoFilter会后执行。



## 五.拦截器Interceptor

什么是拦截器？

* 是一种动态拦截方法调用的机制，类似于过滤器。

* 拦截器是Spring框架中提供的，用来动态拦截控制器方法的执行。

* 拦截器的作用：拦截请求，在指定方法调用前后，根据业务需要执行预先设定的代码。

![image-20260330213125209](/covers/1-jwt-45wl1e/image-20260330213125209.webp)

在拦截器当中，我们通常也是做一些通用性的操作，比如：我们可以通过拦截器来拦截前端发起的请求，将登录校验的逻辑全部编写在拦截器当中。在校验的过程当中，如发现用户登录了(携带JWT令牌且是合法令牌)，就可以直接放行，去访问spring当中的资源。如果校验时发现并没有登录或是非法令牌，就可以直接给前端响应未登录的错误信息。



下面我们通过快速入门程序，来学习下拦截器的基本使用。拦截器的使用步骤和过滤器类似，也分为两步：

1. 定义拦截器

2. 注册配置拦截器



**1). 自定义拦截器**

实现HandlerInterceptor接口，并重写其所有方法

```java
@Slf4j
@Component
public class DemoInterceptor implements HandlerInterceptor {

    //在目标资源方法运行之前运行，true放行，false拦截
    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        log.info("preHandle");
        return true;
    }

    //目标资源方法执行后执行
    @Override
    public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler, @Nullable ModelAndView modelAndView) throws Exception {
        log.info("postHandle");
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler, @Nullable Exception ex) throws Exception {
        log.info("afterCompletion");
    }
}
```

注意：

* preHandle方法：目标资源方法执行前执行。 返回true：放行    返回false：不放行

* postHandle方法：目标资源方法执行后执行

* afterCompletion方法：视图渲染完毕后执行，最后执行

**2). 注册配置拦截器**

在 `com.itheima`下创建一个包，然后创建一个配置类 `WebConfig`， 实现 `WebMvcConfigurer` 接口，并重写 `addInterceptors` 方法

```java
@Configuration  
public class WebConfig implements WebMvcConfigurer {

    //自定义的拦截器对象
    @Autowired
    private DemoInterceptor demoInterceptor;

    
    @Override
    public void addInterceptors(InterceptorRegistry registry) {
       //注册自定义拦截器对象
        registry.addInterceptor(demoInterceptor).addPathPatterns("/**");//设置拦截器拦截的请求路径（ /** 表示拦截所有请求）
    }
}
```

**拦截路径**

首先我们先来看拦截器的拦截路径的配置，在注册配置拦截器的时候，我们要指定拦截器的拦截路径，通过`addPathPatterns("要拦截路径")`方法，就可以指定要拦截哪些资源。

在入门程序中我们配置的是`/**`，表示拦截所有资源，而在配置拦截器时，不仅可以指定要拦截哪些资源，还可以指定不拦截哪些资源，只需要调用`excludePathPatterns("不拦截路径")`方法，指定哪些资源不需要拦截。

```java
@Configuration  
public class WebConfig implements WebMvcConfigurer {

    //拦截器对象
    @Autowired
    private DemoInterceptor demoInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        //注册自定义拦截器对象
        registry.addInterceptor(demoInterceptor)
                .addPathPatterns("/**")//设置拦截器拦截的请求路径（ /** 表示拦截所有请求）
                .excludePathPatterns("/login");//设置不拦截的请求路径
    }
}
```

在拦截器中除了可以设置`/**`拦截所有资源外，还有一些常见拦截路径设置：

![image-20260330220052519](/covers/1-jwt-45wl1e/image-20260330220052519.webp)



**执行流程**

介绍完拦截路径的配置之后，接下来我们再来介绍拦截器的执行流程。通过执行流程，大家就能够清晰的知道过滤器与拦截器的执行时机。

![image-20260330220126019](/covers/1-jwt-45wl1e/image-20260330220126019.webp)

* 当我们打开浏览器来访问部署在web服务器当中的web应用时，此时我们所定义的过滤器会拦截到这次请求。拦截到这次请求之后，它会先执行放行前的逻辑，然后再执行放行操作。而由于我们当前是基于springboot开发的，所以放行之后是进入到了spring的环境当中，也就是要来访问我们所定义的controller当中的接口方法。

* Tomcat并不识别所编写的Controller程序，但是它识别Servlet程序，所以在Spring的Web环境中提供了一个非常核心的Servlet：DispatcherServlet（前端控制器），所有请求都会先进行到DispatcherServlet，再将请求转给Controller。

* 当我们定义了拦截器后，会在执行Controller的方法之前，请求被拦截器拦截住。执行`preHandle()`方法，这个方法执行完成后需要返回一个布尔类型的值，如果返回true，就表示放行本次操作，才会继续访问controller中的方法；如果返回false，则不会放行（controller中的方法也不会执行）。

* 在controller当中的方法执行完毕之后，再回过来执行`postHandle()`这个方法以及`afterCompletion()` 方法，然后再返回给DispatcherServlet，最终再来执行过滤器当中放行后的这一部分逻辑的逻辑。执行完毕之后，最终给浏览器响应数据。



以上就是拦截器的执行流程。通过执行流程分析，大家应该已经清楚了过滤器和拦截器之间的区别，其实它们之间的区别主要是两点：

* **接口规范不同：过滤器需要实现Filter接口，而拦截器需要实现HandlerInterceptor接口。**

* **拦截范围不同：过滤器Filter会拦截所有的资源，而Interceptor只会拦截Spring环境中的资源。**





## 六.ThreadLocal

**介绍：**

ThreadLocal 并不是一个Thread，而是Thread的局部变量。
ThreadLocal为每个线程提供单独一份存储空间，具有线程隔离的效果，只有在线程内才能获取到对应的值，线程外则不能访问。

**常用方法：**

- public void set(T value) 	设置当前线程的线程局部变量的值
- public T get() 		返回当前线程所对应的线程局部变量的值
- public void remove()        移除当前线程的线程局部变量

<img src="/covers/1-jwt-45wl1e/image-20221111212349365.webp" alt="image-20221111212349365" style="zoom:67%;" /> 

**使用步骤**

**1.在sky-common-contex模块创建BaseContext类**

```java
package com.sky.context;

public class BaseContext {

    public static ThreadLocal<Long> threadLocal = new ThreadLocal<>();

    public static void setCurrentId(Long id) {
        threadLocal.set(id);
    }

    public static Long getCurrentId() {
        return threadLocal.get();
    }

    public static void removeCurrentId() {
        threadLocal.remove();
    }

}
```

2.**在拦截器中解析出当前登录员工id，并放入线程局部变量中：**

在sky-server模块中，在JWT拦截器`preHandle`方法里，解析完JWT拿到用户信息后，存入ThreadLocal：

```java
@Component
@Slf4j
public class JwtTokenAdminInterceptor implements HandlerInterceptor {
    @Autowired
    private JwtProperties jwtProperties;

    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) throws Exception {
        //判断当前拦截到的是Controller的方法还是其他资源
        if (!(handler instanceof HandlerMethod)) {
            //当前拦截到的不是动态方法，直接放行
            return true;
        }

        //1、从请求头中获取令牌
        String token = request.getHeader(jwtProperties.getAdminTokenName());

        //2、校验令牌
        try {
            log.info("jwt校验:{}", token);
            Claims claims = JwtUtil.parseJWT(jwtProperties.getAdminSecretKey(), token);
            Long empId = Long.valueOf(claims.get(JwtClaimsConstant.EMP_ID).toString());
            log.info("当前员工id：{}", empId);
            
            
            //将当前用户的id存入ThreadLocal中
            BaseContext.setCurrentId(empId);
            
            
            //3、通过，放行
            return true;
        } catch (Exception ex) {
            //4、不通过，响应401状态码
            response.setStatus(401);
            return false;
        }
    }
}
```

3.**在Service中获取线程局部变量中的值：**

```java
 public void save(EmployeeDTO employeeDTO) {
        //.............................

        //设置当前记录创建人id和修改人id
        employee.setCreateUser(BaseContext.getCurrentId());
        employee.setUpdateUser(BaseContext.getCurrentId());

        employeeMapper.insert(employee);
    }
```

**4.配置拦截器**

```java
@Configuration
@Slf4j
public class WebMvcConfiguration extends WebMvcConfigurationSupport {

    @Autowired
    private JwtTokenAdminInterceptor jwtTokenAdminInterceptor;

    @Autowired
    private JwtTokenUserInterceptor jwtTokenUserInterceptor;
    /**
     * 注册自定义拦截器
     *
     * @param registry
     */
    protected void addInterceptors(InterceptorRegistry registry) {
        log.info("开始注册自定义拦截器...");
        registry.addInterceptor(jwtTokenAdminInterceptor)
                .addPathPatterns("/admin/**")       //添加拦截哪个
                .excludePathPatterns("/admin/employee/login");
        registry.addInterceptor(jwtTokenUserInterceptor)
                .addPathPatterns("/user/**")
                .excludePathPatterns("/user/user/login")     //排除哪个
                .excludePathPatterns("/user/shop/status");

    }
}
```

