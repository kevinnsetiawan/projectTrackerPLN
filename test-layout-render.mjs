import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { createServer } from 'vite';

const store = () => ({ getItem: () => null, setItem() {}, removeItem() {} });
globalThis.localStorage = store();
globalThis.sessionStorage = store();
globalThis.window = { dispatchEvent() {}, addEventListener() {}, removeEventListener() {} };
globalThis.Event = class Event {};

const vite = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
try {
  const { default: Layout } = await vite.ssrLoadModule('/src/components/Layout.jsx');
  const html = renderToString(React.createElement(MemoryRouter, null, React.createElement(Layout)));
  assert.match(html, /Unit aktif/);
  assert.match(html, /PLN PRO-TRACK/);
  console.log('layout SSR render: passed');
} finally {
  await vite.close();
}
