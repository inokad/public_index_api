const fs = require('fs')
const _ = require('lodash')
const { DBService } = require('./src/services/DBService')
const { LogDNALogger } = require('./src/lib/LogDNALogger')
const { IndexerTaskQueueService } = require('./src/services/IndexerTaskQueueService')
const { StoreService } = require('./src/services/StoreService')
const { IndexerService } = require('./src/services/IndexerService')
const { Transformer } = require('./src/lib/Transformer');

((async function main() {
  let configName = null

  if (process.argv.length > 2) {
    [,, configName] = process.argv
  }

  if (_.isEmpty(configName)) {
    console.error('Please provide a config name')
  } else {
    const config = {
      configName,
      ...JSON.parse(fs.readFileSync(`/etc/company/config/${configName}.json`, 'utf8'))
    }

    config.logdnaLogger = new LogDNALogger(config)
    await config.logdnaLogger.init()

    const dbService = new DBService(config)
    await dbService.connect()

    const indexerTaskQueue = new IndexerTaskQueueService(dbService, config)
    await indexerTaskQueue.init()

    const storeService = new StoreService(dbService, config)
    await storeService.init()

    const transformer = new Transformer(config)

    const storeNames = await storeService.getActiveStoreIds()
    const indexerServices = []
    _.forEach(storeNames, async (store) => {
      const service = new IndexerService(storeService, indexerTaskQueue, transformer, config, store)
      await service.start()
      indexerServices.push(service)
    })

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        _.forEach(indexerServices, async (service) => {
          if (service) {
            await service.shutdown()
          }
        })

        if (indexerTaskQueue) {
          await indexerTaskQueue.shutdown()
        }

        if (dbService) {
          await dbService.disconnect()
        }

        if (config.logdnaLogger) {
          await config.logdnaLogger.shutdown()
        }

        process.exit(0)
      } catch (e) {
        console.error(e)
        process.exit(1)
      }
    })

    if (process.send) {
      process.send('ready')
    }
  }
})())