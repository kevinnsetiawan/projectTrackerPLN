import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createServer } from 'vite';

const vite = await createServer({ server: { middlewareMode: true }, logLevel: 'error' });
try {
  const { matrixDiff, MatrixTable } = await vite.ssrLoadModule('/src/pages/SecurityMatrix.jsx');
  const base = { staff: ['projects_read'], asman: ['projects_read', 'project_write'] };
  const draft = { staff: ['projects_read', 'agenda_read'], asman: ['projects_read'] };
  assert.deepEqual(matrixDiff(base, draft), [
    { role: 'staff', action: 'agenda_read', kind: 'ditambahkan' },
    { role: 'asman', action: 'project_write', kind: 'dihapus' },
  ]);
  assert.deepEqual(matrixDiff(base, base), []);
  const html = renderToString(React.createElement(MatrixTable, {
    kind: 'upt',
    rules: { can_edit: false, locked_cells: [] },
    groups: { read: ['agenda_read'], operational: [], approval: [], iam: ['security_matrix'] },
    labels: { agenda_read: 'Agenda', security_matrix: 'Security Matrix' },
    roleNames: ['staff'],
    current: { staff: ['agenda_read'] },
    locked: () => ({ reason: 'Terkunci oleh kebijakan' }),
    toggle: () => {},
  }));
  assert.match(html, /Agenda/);
  assert.match(html, /Staff/);
  assert.match(html, /Terkunci oleh kebijakan/);
  assert.match(html, /type="checkbox"/);
  assert.match(html, /disabled=""/);
  assert.match(html, /checked=""/);

  const editableHtml = renderToString(React.createElement(MatrixTable, {
    kind: 'upt',
    rules: { can_edit: true, locked_cells: [] },
    groups: { read: ['agenda_read'], operational: [], approval: [], iam: [] },
    labels: { agenda_read: 'Agenda' },
    roleNames: ['staff'],
    current: { staff: [] },
    locked: () => null,
    toggle: () => {},
  }));
  assert.match(editableHtml, /type="checkbox"/);
  assert.doesNotMatch(editableHtml, /disabled=""/);
  console.log('security matrix UI diff: passed');
} finally {
  await vite.close();
}
