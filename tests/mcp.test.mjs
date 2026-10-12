import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

// Protocol-level checks for functions/mcp.ts; no database is needed.
const dir = await mkdtemp(join(tmpdir(), 'estatein-mcp-'));
try {
  const out = join(dir, 'mcp.mjs');
  await build({ entryPoints: ['functions/mcp.ts'], outfile: out, bundle: true, platform: 'node', format: 'esm', logLevel: 'silent' });
  const { onRequest } = await import(pathToFileURL(out));
  const env = { MCP_API_KEY: 'test-key' };
  const rpc = (body, headers = { authorization: 'Bearer test-key' }, e = env, method = 'POST') =>
    onRequest({ env: e, request: new Request('http://localhost/mcp', { method, headers, body: method === 'POST' ? JSON.stringify(body) : undefined }) });

  assert.equal((await rpc({}, {}, {})).status, 503, 'disabled without MCP_API_KEY');
  assert.equal((await rpc({}, {})).status, 401);
  assert.equal((await rpc({}, { authorization: 'Bearer nope' })).status, 401);
  assert.equal((await rpc(null, undefined, env, 'GET')).status, 405);

  const init = await (await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26' } })).json();
  assert.equal(init.result.protocolVersion, '2025-03-26');
  assert.ok(init.result.capabilities.tools);

  assert.equal((await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' })).status, 202);
  const list = await (await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' })).json();
  assert.deepEqual(list.result.tools.map(t => t.name), ['search_properties', 'get_property', 'list_agencies', 'list_agents']);
  assert.equal((await (await rpc({ jsonrpc: '2.0', id: 3, method: 'nope' })).json()).error.code, -32601);
  assert.equal((await (await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'nope' } })).json()).error.code, -32602);

  const missing = await (await rpc({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'get_property', arguments: {} } })).json();
  assert.equal(missing.result.isError, true);
  const bad = await (await rpc({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'search_properties', arguments: { latitude: 10 } } })).json();
  assert.equal(bad.result.isError, true, 'nearby search needs both coordinates');

  const batch = await (await rpc([{ jsonrpc: '2.0', id: 7, method: 'ping' }, { jsonrpc: '2.0', method: 'notifications/initialized' }])).json();
  assert.equal(batch.length, 1);
  console.log('mcp tests passed');
} finally { await rm(dir, { recursive: true, force: true }); }
