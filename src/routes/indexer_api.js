const { IndexerService } = require('../services/IndexerService')

module.exports = async function indexRoute(server, dbService, confObj) {
  const config = {
    ...confObj
  }

  const taskService = new IndexerService(dbService, config)
  await taskService.init()
}
