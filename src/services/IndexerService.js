const _ = require('lodash')
const { Logger } = require('../lib/Logger')
const { WorkIntervalTimer } = require('../lib/WorkIntervalTimer')
const { TaskTypes } = require('./IndexerTaskQueueService')

class IndexerService extends Logger {
  constructor(storeService, indexerTaskQueue, transformer, config, storeId) {
    super('IndexerService', config, { storeId })
    this.__indexerTaskQueue = indexerTaskQueue
    this.__storeId = storeId
    this.__transformer = transformer
    this.__indexingTimer = new WorkIntervalTimer('IndexingTimer', config, 5)
    this.__storeService = storeService
    this.__indexAPIClient = storeService.getIndexAPIClient(storeId)
    if (!this.__indexAPIClient) {
      this._logErr(`No indexing API client is found for the store ${storeId}`)
    }
  }

  __createNoFailPromiseForUpdate(taskId, product) {
    return new Promise((resolve) => {
      this.__indexAPIClient.index(product)
        .then((res) => {
          resolve({
            taskId,
            success: true,
            result: res
          })
        })
        .catch((e) => {
          resolve({
            taskId,
            success: false,
            error: e
          })
        })
    })
  }

  __createNoFailPromiseForDelete(taskId, productId) {
    return new Promise((resolve) => {
      this.__indexAPIClient.delete(productId)
        .then((res) => {
          resolve({
            taskId,
            success: true,
            result: res
          })
        })
        .catch((e) => {
          resolve({
            taskId,
            success: false,
            error: e
          })
        })
    })
  }

  async __processBatch(batchSize = 50) {
    let indexTask = null
    let numIterations = 0

    const requestBatch = []

    do {
      // eslint-disable-next-line no-await-in-loop
      indexTask = await this.__indexerTaskQueue.getNext(this.__storeId)
      if (indexTask) {
        const taskId = _.get(indexTask, 'taskId')
        const taskType = _.get(indexTask, 'taskData.type')

        if (taskType === TaskTypes.UPDATE) {
          const product = _.get(indexTask, 'taskData.product')
          const productId = _.get(indexTask, 'taskData.product.id')
          const productRec = this.__transformer.createProductRecord(product)
          this._logInfo(`Updating product ${productId}`)
          requestBatch.push(this.__createNoFailPromiseForUpdate(taskId, productRec))
        } else if (taskType === TaskTypes.DELETE) {
          const productId = _.get(indexTask, 'taskData.productId')
          this._logInfo(`Deleting product ${productId}`)
          requestBatch.push(this.__createNoFailPromiseForDelete(taskId, productId))
        } else {
          this._logWarn(`Unknown task type ${taskType}. Ignored`)
        }
      }
      numIterations += 1
    } while (indexTask && numIterations < batchSize)

    if (!_.isEmpty(requestBatch)) {
      const apiResults = await Promise.all(requestBatch)

      const successTasks = []
      const taskErrorMap = {}

      _.forEach(apiResults, (apiRes) => {
        const {
          taskId, success, error
        } = apiRes

        if (success) {
          successTasks.push(taskId)
        } else if (_.has(error, 'extra')) {
          taskErrorMap[taskId] = error.extra
        } else {
          taskErrorMap[taskId] = _.get(error, 'message')
        }
      })

      if (!_.isEmpty(successTasks)) {
        this._logInfo(`Marking following tasks success ${_.join(successTasks)}`)
        await this.__indexerTaskQueue.markComplete(successTasks)
      }

      if (!_.isEmpty(taskErrorMap)) {
        this._logErr(`Marking following tasks error ${_.join(_.keys(taskErrorMap))}`)
        await this.__indexerTaskQueue.markError(taskErrorMap)
      }

      return true
    }

    return false
  }

  async start() {
    this.__indexingTimer.start(async () => {
      const retVal = await this.__processBatch()
      return retVal
    })
  }

  async shutdown() {
    if (this.__indexingTimer) {
      await this.__indexingTimer.shutdown()
    }
  }
}

module.exports = {
  IndexerService
}