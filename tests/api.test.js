'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createServer } = require('../server.js');

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

function request(port, method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? null : body;
    const options = {
      hostname: '127.0.0.1',
      port: port,
      method: method,
      path: urlPath,
      headers: payload === null ? {} : { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try {
          json = JSON.parse(text);
        } catch (error) {
          json = null;
        }
        resolve({ status: res.statusCode, text: text, json: json });
      });
    });
    req.on('error', reject);
    if (payload !== null) {
      req.write(payload);
    }
    req.end();
  });
}

const server = createServer();

server.listen(0, async () => {
  const port = server.address().port;

  try {
    const ok = await request(port, 'POST', '/reprice', JSON.stringify(products));
    test('POST /reprice with array returns HTTP 200', () => assert.equal(ok.status, 200));
    test('POST /reprice returns one result per product, in order, matching expected.json', () => {
      assert.deepStrictEqual(ok.json, expected);
    });
    test('POST /reprice response is an array', () => assert.ok(Array.isArray(ok.json)));

    const objectBody = await request(port, 'POST', '/reprice', JSON.stringify({ sku: 'P-1' }));
    test('POST /reprice with object returns HTTP 400', () => assert.equal(objectBody.status, 400));

    const stringBody = await request(port, 'POST', '/reprice', JSON.stringify('not-an-array'));
    test('POST /reprice with JSON string returns HTTP 400', () => assert.equal(stringBody.status, 400));

    const brokenJson = await request(port, 'POST', '/reprice', '{not valid json');
    test('POST /reprice with invalid JSON returns HTTP 400', () => assert.equal(brokenJson.status, 400));

    const page = await request(port, 'GET', '/reprice.html');
    test('GET /reprice.html serves the interface (HTTP 200)', () => assert.equal(page.status, 200));

    const notFound = await request(port, 'GET', '/does-not-exist');
    test('GET unknown path returns HTTP 404', () => assert.equal(notFound.status, 404));
  } catch (error) {
    failed += 1;
    console.error('FAIL - unexpected error during API tests');
    console.error('       ' + error.message);
  } finally {
    server.close(() => {
      console.log('\n' + passed + ' passed, ' + failed + ' failed');
      process.exit(failed === 0 ? 0 : 1);
    });
  }
});
