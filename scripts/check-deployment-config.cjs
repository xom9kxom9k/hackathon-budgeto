const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const config = JSON.parse(readFileSync(process.argv[2], 'utf8'));
for (const name of ['postgres', 'redis', 'api', 'worker', 'migration']) {
  assert.equal(config.services[name].ports, undefined, `${name} must not publish ports`);
}
for (const name of ['postgres', 'redis', 'caddy', 'migration']) {
  assert.equal(
    config.services[name].environment?.AUTH_ENCRYPTION_KEY,
    undefined,
    `${name} must not receive the encryption key`,
  );
}
for (const name of ['api', 'worker', 'migration']) {
  assert.equal(config.services[name].read_only, true);
  assert.deepEqual(config.services[name].cap_drop, ['ALL']);
}
assert.equal(
  config.services.api.environment.IMPORT_STAGING_DIR,
  config.services.worker.environment.IMPORT_STAGING_DIR,
);
assert.equal(
  config.services.api.environment.AUTH_ENCRYPTION_KEY,
  config.services.worker.environment.AUTH_ENCRYPTION_KEY,
);
assert.equal(config.services.caddy.depends_on.api.condition, 'service_healthy');
assert.equal(config.networks.backend.internal, true);
assert.equal(config.services.caddy.networks.backend, undefined);
console.log(
  'Deployment port exposure, secret scope, shared staging configuration and runtime restrictions verified',
);
