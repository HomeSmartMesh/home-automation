/* eslint-disable no-console */
'use strict';

const fs = require('fs');
const path = require('path');

function usage(exitCode) {
  console.error('Usage: node z2m_request_backup.js --config PATH --out PATH [--timeout-ms N]');
  process.exit(exitCode);
}

function getArgValue(argv, name) {
  const idx = argv.indexOf(name);
  if (idx === -1) return null;
  if (idx + 1 >= argv.length) usage(2);
  return argv[idx + 1];
}

function hasArg(argv, name) {
  return argv.includes(name);
}

const argv = process.argv.slice(2);
if (hasArg(argv, '-h') || hasArg(argv, '--help')) usage(0);

const configPath = getArgValue(argv, '--config');
const outPath = getArgValue(argv, '--out');
const timeoutMsRaw = getArgValue(argv, '--timeout-ms') || '30000';
const timeoutMs = Number(timeoutMsRaw);

if (!configPath || !outPath || !Number.isFinite(timeoutMs) || timeoutMs <= 0) usage(2);

const nodePathHint = process.env.NODE_PATH || '/opt/zigbee2mqtt/node_modules';
let yaml;
let mqtt;
try {
  // Expect to run with NODE_PATH=/opt/zigbee2mqtt/node_modules
  yaml = require('js-yaml');
  mqtt = require('mqtt');
} catch (e) {
  console.error(`Missing node deps. Try: NODE_PATH=${nodePathHint} node z2m_request_backup.js ...`);
  console.error(String(e && e.message ? e.message : e));
  process.exit(2);
}

const rawConfig = fs.readFileSync(configPath, 'utf8');
const config = yaml.load(rawConfig) || {};
const mqttCfg = config.mqtt || {};
const baseTopic = (mqttCfg.base_topic || 'zigbee2mqtt').toString();
const server = (mqttCfg.server || 'mqtt://localhost').toString();

const options = {
  // Keep this minimal; most setups are unauthenticated localhost.
  username: mqttCfg.user,
  password: mqttCfg.password,
  clientId: `z2m-backup-${Date.now()}`,
  reconnectPeriod: 0,
};

const requestTopic = `${baseTopic}/bridge/request/backup`;
const responseTopic = `${baseTopic}/bridge/response/backup`;

const outDir = path.dirname(outPath);
fs.mkdirSync(outDir, {recursive: true});

const client = mqtt.connect(server, options);

let timer = null;
let done = false;

function finish(code, message) {
  if (done) return;
  done = true;
  if (timer) clearTimeout(timer);
  try { client.end(true); } catch (_) {}
  if (message) console.error(message);
  process.exit(code);
}

timer = setTimeout(() => {
  finish(1, `Timeout waiting for ${responseTopic} after ${timeoutMs}ms`);
}, timeoutMs);

client.on('connect', () => {
  client.subscribe(responseTopic, {qos: 0}, (err) => {
    if (err) return finish(1, `MQTT subscribe failed: ${err.message}`);
    client.publish(requestTopic, '', {qos: 0, retain: false}, (pubErr) => {
      if (pubErr) return finish(1, `MQTT publish failed: ${pubErr.message}`);
    });
  });
});

client.on('message', (_topic, payloadBuf) => {
  let payload;
  try {
    payload = JSON.parse(payloadBuf.toString('utf8'));
  } catch (e) {
    return finish(1, `Invalid JSON on ${responseTopic}: ${e.message}`);
  }

  if (!payload || payload.status !== 'ok' || !payload.data || !payload.data.zip) {
    const err = payload && payload.error ? payload.error : 'Unexpected backup response payload';
    return finish(1, `Backup failed: ${err}`);
  }

  let zipBuf;
  try {
    zipBuf = Buffer.from(payload.data.zip, 'base64');
  } catch (e) {
    return finish(1, `Failed to decode base64 zip: ${e.message}`);
  }

  fs.writeFileSync(outPath, zipBuf);
  console.log(outPath);
  finish(0);
});

client.on('error', (err) => {
  finish(1, `MQTT error: ${err.message}`);
});

