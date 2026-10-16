'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { calculateReprice } = require('./reprice.js');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body)
  });
  response.end(body);
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on('data', (chunk) => chunks.push(chunk));
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });
}

async function handleReprice(request, response) {
  let rawBody;
  try {
    rawBody = await readRequestBody(request);
  } catch (error) {
    sendJson(response, 400, { error: 'Could not read request body.' });
    return;
  }

  let parsedBody;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch (error) {
    sendJson(response, 400, { error: 'Request body must be valid JSON.' });
    return;
  }

  if (!Array.isArray(parsedBody)) {
    sendJson(response, 400, { error: 'Request body must be an array of products.' });
    return;
  }

  sendJson(response, 200, calculateReprice(parsedBody));
}

function serveStatic(request, response, pathname) {
  const requestedPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.normalize(path.join(ROOT, decodeURIComponent(requestedPath)));

  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    sendJson(response, 403, { error: 'Forbidden.' });
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(response, 404, { error: 'Not found.' });
      return;
    }
    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': contentType });
    response.end(content);
  });
}

function createServer() {
  return http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;

    if (pathname === '/reprice') {
      if (request.method !== 'POST') {
        response.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8', Allow: 'POST' });
        response.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
        return;
      }
      handleReprice(request, response);
      return;
    }

    if (request.method !== 'GET') {
      sendJson(response, 405, { error: 'Method not allowed.' });
      return;
    }

    serveStatic(request, response, pathname);
  });
}

if (require.main === module) {
  createServer().listen(PORT, () => {
    console.log('SaleScout server listening on http://localhost:' + PORT);
    console.log('  UI:  http://localhost:' + PORT + '/reprice.html');
    console.log('  API: POST http://localhost:' + PORT + '/reprice');
  });
}

module.exports = { createServer };
