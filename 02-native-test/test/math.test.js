import { test, describe } from 'node:test';
import assert from 'node:assert';
import { add, multiply } from '../math.js';

describe('math.js', () => {
  test('add() adds two numbers', () => {
    assert.strictEqual(add(2, 3), 5);
  });

  test('add() throws on non-numeric input', () => {
    assert.throws(() => add('a', 2), {
      name: 'TypeError',
      message: /Inputs must be numbers/
    });
  });

  test('multiply() returns a product', async () => {
    const result = await multiply(4, 5);
    assert.strictEqual(result, 20);
  });
});
