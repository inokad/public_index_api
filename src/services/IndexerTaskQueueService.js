
const { TaskQueueServiceBase } = require('../lib/TaskQueueServiceBase')

const TaskTypes = {
  DELETE: 'delete',
  UPDATE: 'update'
}

class IndexerTaskQueueService extends TaskQueueServiceBase {
  constructor(dbService, config) {
    super('IndexerTaskQueueService', dbService, 'indexer_task_queue', config)
  }

  async queueIndexTask(storeId, productObj) {
    const { id } = productObj
    const retVal = await this._addTask(storeId, id, {
      type: TaskTypes.UPDATE,
      product: productObj
    })
    return retVal
  }

  async queueDeleteTask(storeId, productId) {
    const retVal = await this._addTask(storeId, productId, {
      type: TaskTypes.DELETE,
      productId
    })
    return retVal
  }
}

module.exports = {
  IndexerTaskQueueService,
  TaskTypes
}