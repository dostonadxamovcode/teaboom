'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { calculateResult, calculateReprice } = require('../reprice.js');

const products = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'products.json'), 'utf8'));
const expected = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'expected.json'), 'utf8'));

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log('ok   - ' + name);
  } catch (error) {
    failed += 1;
    console.error('FAIL - ' + name);
    console.error('       ' + error.message);
  }
}

function product(overrides) {
  return Object.assign(
    { sku: 'X', name: 'Test', myPrice: 100, minPrice: 50, maxPrice: 150, step: 10, competitors: [] },
    overrides
  );
}

test('matches data/expected.json exactly (values and order)', () => {
  assert.deepStrictEqual(calculateReprice(products), expected);
});

test('result objects contain sku, oldPrice, newPrice, reason in order', () => {
  assert.deepStrictEqual(Object.keys(calculateResult(product({}))), ['sku', 'oldPrice', 'newPrice', 'reason']);
});

test('oldPrice equals the original myPrice', () => {
  calculateReprice(products).forEach((result, index) => {
    assert.equal(result.oldPrice, products[index].myPrice);
  });
});

test('no-competitors: empty array -> maxPrice + NO_COMPETITORS', () => {
  const result = calculateResult(product({ competitors: [] }));
  assert.deepStrictEqual(result, { sku: 'X', oldPrice: 100, newPrice: 150, reason: 'NO_COMPETITORS' });
});

test('no-competitors: all competitors out of stock -> maxPrice + NO_COMPETITORS', () => {
  const result = calculateResult(
    product({
      competitors: [
        { seller: 'A', price: 20, inStock: false },
        { seller: 'B', price: 30, inStock: false }
      ]
    })
  );
  assert.equal(result.newPrice, 150);
  assert.equal(result.reason, 'NO_COMPETITORS');
});

test('out-of-stock competitors are ignored when in-stock ones exist', () => {
  const result = calculateResult(
    product({
      myPrice: 2500,
      minPrice: 2100,
      maxPrice: 2600,
      step: 50,
      competitors: [
        { seller: 'CheapNoStock', price: 100, inStock: false },
        { seller: 'InStock', price: 2400, inStock: true }
      ]
    })
  );
  assert.equal(result.newPrice, 2350);
  assert.equal(result.reason, 'UNDERCUT');
});

test('normal undercut: floor(lowest in-stock - step)', () => {
  const result = calculateResult(
    product({
      maxPrice: 300,
      competitors: [{ seller: 'A', price: 200, inStock: true }]
    })
  );
  assert.equal(result.newPrice, 190);
  assert.equal(result.reason, 'UNDERCUT');
});

test('AT_MIN: candidate below minPrice is clamped to minPrice', () => {
  const result = calculateResult(
    product({
      myPrice: 1500,
      minPrice: 1400,
      maxPrice: 1600,
      step: 100,
      competitors: [{ seller: 'A', price: 1450, inStock: true }]
    })
  );
  assert.equal(result.newPrice, 1400);
  assert.equal(result.reason, 'AT_MIN');
});

test('AT_MAX: candidate above maxPrice is clamped to maxPrice', () => {
  const result = calculateResult(
    product({
      myPrice: 3000,
      minPrice: 2900,
      maxPrice: 3000,
      step: 50,
      competitors: [{ seller: 'A', price: 3100, inStock: true }]
    })
  );
  assert.equal(result.newPrice, 3000);
  assert.equal(result.reason, 'AT_MAX');
});

test('boundary: candidate equal to minPrice is UNDERCUT (not AT_MIN)', () => {
  const result = calculateResult(
    product({
      minPrice: 2000,
      maxPrice: 2500,
      step: 50,
      competitors: [{ seller: 'A', price: 2050, inStock: true }]
    })
  );
  assert.equal(result.newPrice, 2000);
  assert.equal(result.reason, 'UNDERCUT');
});

test('boundary: candidate equal to maxPrice is UNDERCUT (not AT_MAX)', () => {
  const result = calculateResult(
    product({
      minPrice: 1500,
      maxPrice: 2000,
      step: 50,
      competitors: [{ seller: 'A', price: 2050, inStock: true }]
    })
  );
  assert.equal(result.newPrice, 2000);
  assert.equal(result.reason, 'UNDERCUT');
});

test('boundary: candidate minPrice - 1 is AT_MIN', () => {
  const result = calculateResult(
    product({
      minPrice: 2000,
      maxPrice: 2500,
      step: 50,
      competitors: [{ seller: 'A', price: 2049, inStock: true }]
    })
  );
  assert.equal(result.newPrice, 2000);
  assert.equal(result.reason, 'AT_MIN');
});

test('boundary: candidate maxPrice + 1 is AT_MAX', () => {
  const result = calculateResult(
    product({
      minPrice: 1500,
      maxPrice: 2000,
      step: 50,
      competitors: [{ seller: 'A', price: 2051, inStock: true }]
    })
  );
  assert.equal(result.newPrice, 2000);
  assert.equal(result.reason, 'AT_MAX');
});

test('Math.floor is applied to the candidate price', () => {
  const result = calculateResult(
    product({
      minPrice: 1400,
      maxPrice: 1600,
      step: 0.5,
      competitors: [{ seller: 'A', price: 1499.99, inStock: true }]
    })
  );
  assert.equal(result.newPrice, 1499);
  assert.equal(result.reason, 'UNDERCUT');
});

test('SKUs and product order are preserved', () => {
  const results = calculateReprice(products);
  assert.deepStrictEqual(results.map((result) => result.sku), products.map((item) => item.sku));
});

test('order preservation is input-driven, not sorted', () => {
  const reversed = products.slice().reverse();
  const results = calculateReprice(reversed);
  assert.deepStrictEqual(results.map((result) => result.sku), reversed.map((item) => item.sku));
  assert.deepStrictEqual(products.slice().reverse().map((item) => item.sku), ['P-1006', 'P-1005', 'P-1004', 'P-1003', 'P-1002', 'P-1001']);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
