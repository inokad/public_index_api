const restify = require('restify')
const _ = require('lodash')
const fs = require('fs')
const corsMiddleware = require('restify-cors-middleware')
const errors = require('restify-errors')
const { LogDNALogger } = require('./lib/LogDNALogger')
const { DBService } = require('./services/DBService')

module.exports = async function serverSetup(serverPortKey, cb, configObj) {
  let config = null

  if (configObj) {
    config = configObj
  } else {
    // Construct config and execute manin
    let configName = null
    if (process.argv.length > 2) {
      [,, configName] = process.argv
    }

    if (_.isEmpty(configName)) {
      console.error('Please provide a config name')
    } else {
      config = {
        configName,
        ...JSON.parse(fs.readFileSync(`/etc/company/config/${configName}.json`, 'utf8'))
      }
    }
  }

  if (config) {
    config.logdnaLogger = new LogDNALogger(config)

    await config.logdnaLogger.init()

    const dbService = new DBService(config)

    await dbService.connect()

    const server = restify.createServer({
      // name: config.name,
    })

    server.use((req, res, next) => {
      const storeId = _.get(req, 'headers.x-consumer-username')
      if (!_.isEmpty(storeId)) {
        const stores = _.get(config, 'stores', {})
        if (stores[storeId]) {
          req.store = {
            storeId,
            ...stores[storeId]
          }
          return next()
        }
      }

      if (_.has(req, 'store')) {
        return next()
      }

      return next(
        new errors.UnauthorizedError(
          'Store Id not found. Please contact Administrator',
        )
      )
    })

    const cors = corsMiddleware({
      preflightMaxAge: 5, // Optional
      origins: ['*'],
      allowHeaders: ['X-Client-ID', 'X-Real-IP', 'X-Forwarded-For']
      // exposeHeaders: ['API-Token-Expiry']
    })

    server.pre(cors.preflight)
    server.use(cors.actual)
    server.use(restify.plugins.bodyParser())
    server.use(restify.plugins.acceptParser(server.acceptable))
    server.use(restify.plugins.queryParser())
    server.use(restify.plugins.fullResponse())

    let shutdownFunction = null
    if (cb) {
      shutdownFunction = await cb(server, dbService, config)
    }

    const serverPort = _.get(config, serverPortKey)

    server.listen(serverPort, () => {
      console.log(`Server is listening on port ${serverPort}`)

      if (process.send) {
        process.send('ready')
      }
    })

    // Graceful shutdown
    process.on('SIGINT', () => {
      server.close(async () => {
        try {
          if (shutdownFunction) {
            await shutdownFunction()
          }

          if (config.logdnaLogger) {
            await config.logdnaLogger.shutdown()
          }

          await dbService.disconnect()

          process.exit(0)
        } catch (e) {
          process.exit(1)
        }
      })
    })
  }
}