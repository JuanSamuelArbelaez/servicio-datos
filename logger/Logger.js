// ./lib/logger.js
function log(level, logger, message, meta = {}) {
  const payload = {
    timestamp: new Date().toISOString(), // RFC3339-ish
    level,
    logger,
    message,
    thread: process.pid.toString(),
    ...meta
  };
  console.log(JSON.stringify(payload));
}

module.exports = {
  info: (logger, message, meta) => log('info', logger, message, meta),
  debug: (logger, message, meta) => log('debug', logger, message, meta),
  warn: (logger, message, meta) => log('warn', logger, message, meta),
  error: (logger, message, meta) => log('error', logger, message, meta),
};
