export function add(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new TypeError('Inputs must be numbers');
    }
    return a + b;
  }
  
  export async function multiply(a, b) {
    // Simulate async operation
    await new Promise((res) => setTimeout(res, 10));
    return a * b;
  }
  