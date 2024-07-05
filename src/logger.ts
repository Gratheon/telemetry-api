import winston, { transports, format } from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  levels: Object.assign({ 'fatal': 0, 'warn': 4, 'trace': 7 }, winston.config.syslog.levels),
  format: format.json(),
  defaultMeta: { service: 'telemetry-api' },
  transports: [
    new transports.Console({
      format: format.combine(
        format.timestamp({format: 'HH:mm:ss'}),
        format.colorize({all: true}),
        format.printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
      ),
      handleExceptions: true
    }),
  ],
});

logger.child = function () { return winston.loggers.get("default") };

process.on('uncaughtException', function (err) {
  console.log("UncaughtException processing: %s", err);
});
