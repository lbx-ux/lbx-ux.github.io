---
title: 4.正则工具类
description: RegexPatterns类是一个专门用来集中存储和管理“正则表达式”常量的字典类
pubDate: 2026-10-10
series: 工具
order: 4
source: 工具/4.正则工具类
---

`RegexPatterns` 类是一个专门用来**集中存储和管理“正则表达式”常量的字典类**

```JAVA
public abstract class RegexPatterns {
    /**
     * 手机号正则
     */
    public static final String PHONE_REGEX = "^1([38][0-9]|4[579]|5[0-3,5-9]|6[6]|7[0135678]|9[89])\\d{8}$";
    /**
     * 邮箱正则
     */
    public static final String EMAIL_REGEX = "^[a-zA-Z0-9_-]+@[a-zA-Z0-9_-]+(\\.[a-zA-Z0-9_-]+)+$";
    /**
     * 密码正则,4~32位的字母、数字、下划线
     */
    public static final String PASSWORD_REGEX = "^\\w{4,32}$";
    /**
     * 验证码正则, 6位数字或字母
     */
    public static final String VERIFY_CODE_REGEX = "^[a-zA-Z\\d]{6}$";
}
```



`RegexUtils` 工具类的主要作用是**基于正则表达式，校验常见的用户输入数据格式是否无效**

**代码设计特点：反向校验 (Fail-Fast)**;

这个工具类在命名和逻辑上采用的是“判断是否无效 (`Invalid`)”的思路。

- 如果输入数据**不符合**要求（为空或者正则不匹配），方法返回 `true`。
- 如果输入数据**完全符合**要求，方法返回 `false`。

```java
public class RegexUtils {
    /**
     * 是否是无效手机格式
     * @param phone 要校验的手机号
     * @return true:符合，false：不符合
     */
    public static boolean isPhoneInvalid(String phone){
        return mismatch(phone, RegexPatterns.PHONE_REGEX);
    }
    /**
     * 是否是无效邮箱格式
     * @param email 要校验的邮箱
     * @return true:符合，false：不符合
     */
    public static boolean isEmailInvalid(String email){
        return mismatch(email, RegexPatterns.EMAIL_REGEX);
    }

    /**
     * 是否是无效验证码格式
     * @param code 要校验的验证码
     * @return true:符合，false：不符合
     */
    public static boolean isCodeInvalid(String code){
        return mismatch(code, RegexPatterns.VERIFY_CODE_REGEX);
    }

    // 校验是否不符合正则格式
    private static boolean mismatch(String str, String regex){
        if (StrUtil.isBlank(str)) {
            return true;
        }
        return !str.matches(regex);
    }
}
```