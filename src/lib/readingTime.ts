/**
 * 阅读时长估算：中文按字数（约 300 字/分钟），英文按词数（约 200 词/分钟），
 * 代码块按行数加权（10 行/分钟，取 0.3 系数叠加）。
 */
export function estimateReadingTime(content: string): number {
  // 去掉代码块单独统计
  const codeBlocks = content.match(/```[\s\S]*?```/g) ?? [];
  const codeLines = codeBlocks.reduce((n, block) => n + block.split('\n').length, 0);
  const prose = content.replace(/```[\s\S]*?```/g, '');

  const cjkChars = (prose.match(/[一-鿿㐀-䶿]/g) ?? []).length;
  const words = (prose
    .replace(/[一-鿿㐀-䶿]/g, ' ')
    .match(/[a-zA-Z0-9_'-]+/g) ?? []).length;

  const proseMinutes = cjkChars / 300 + words / 200;
  const codeMinutes = (codeLines / 10) * 0.3;
  return Math.max(1, Math.round(proseMinutes + codeMinutes));
}

export function formatReadingTime(minutes: number): string {
  return `约 ${minutes} 分钟`;
}
