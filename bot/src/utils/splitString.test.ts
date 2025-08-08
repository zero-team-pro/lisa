import { describe, expect, test } from '@jest/globals';
import { splitStringArray } from './splitString';

describe('splitString', () => {
  test('splitStringArray Default', () => {
    const res1 = splitStringArray(['ab', 'cde', 'fghij'], 5);
    expect(res1).toEqual(['abcde', 'fghij']);

    const res2 = splitStringArray(['ab', 'cd', 'ef', 'g'], 3);
    expect(res2).toEqual(['ab', 'cd', 'efg']);

    const res3 = splitStringArray(['', 'a', '', 'bc'], 2);
    expect(res3).toEqual(['a', 'bc']);

    const res4 = splitStringArray(['abcd', 'ef', 'gh', 'ij'], 5);
    expect(res4).toEqual(['abcd', 'efgh', 'ij']);
  });

  test('splitStringArray Overflow', () => {
    const res1 = splitStringArray(['ab', 'cd', 'efghij'], 5);
    expect(res1).toEqual(['abcd', 'efghi', 'j']);
  });
});
