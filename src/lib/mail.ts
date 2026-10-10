/**
 * 联系邮箱的渲染辅助。
 *
 * 目标：页面上正常显示、可一键发信，但构建产物里不留可直接抓取的明文——
 * 可见文字转成 HTML 实体（浏览器原生解码，人眼与剪贴板都正常，无 JS 也能读），
 * href 由 src/scripts/site.ts 在运行时从 data-mail-* 拼出。
 * 这能挡掉按正则扫 mailto:/user@domain 的常见爬虫；会执行 JS 的爬虫挡不住，个人站够用。
 */
import { EMAIL } from '@/consts';

/** 逐字符转 HTML 十进制实体 */
export function entities(s: string): string {
  return [...s].map((c) => `&#${c.charCodeAt(0)};`).join('');
}

/** 实体化后的完整地址，供组件 set:html 渲染 */
export function mailText(): string {
  return entities(`${EMAIL.user}@${EMAIL.domain}`);
}
