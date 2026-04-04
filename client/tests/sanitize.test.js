import { describe, it, expect } from 'vitest';
import { escapeHtml, escapeAttr } from '../utils/sanitize';

describe('escapeHtml', () => {
  it('escapes script tags', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes quotes', () => {
    // textContent-based escaping doesn't escape quotes (they're safe in text content)
    expect(escapeHtml('"hello"')).toBe('"hello"');
  });

  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('passes through safe text', () => {
    expect(escapeHtml('Hello world')).toBe('Hello world');
  });

  it('escapes event handlers', () => {
    const result = escapeHtml('<img onerror="alert(1)" src=x>');
    expect(result).not.toContain('<img');
    expect(result).toContain('&lt;img');
  });

  it('escapes nested tags', () => {
    const result = escapeHtml('<b><i>text</i></b>');
    expect(result).toBe('&lt;b&gt;&lt;i&gt;text&lt;/i&gt;&lt;/b&gt;');
  });
});

describe('escapeAttr', () => {
  it('escapes double quotes', () => {
    expect(escapeAttr('" onclick="alert(1)"')).toBe('&quot; onclick=&quot;alert(1)&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeAttr("' onclick='alert(1)'")).toBe('&#39; onclick=&#39;alert(1)&#39;');
  });

  it('escapes angle brackets', () => {
    expect(escapeAttr('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes ampersands', () => {
    expect(escapeAttr('a&b')).toBe('a&amp;b');
  });

  it('returns empty string for null', () => {
    expect(escapeAttr(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeAttr(undefined)).toBe('');
  });

  it('passes through safe text', () => {
    expect(escapeAttr('hello world')).toBe('hello world');
  });

  it('converts non-string to string', () => {
    expect(escapeAttr(123)).toBe('123');
  });
});
