const _ = require('lodash')
const { ObjectId } = require('mongodb')
const { Logger } = require('./Logger')
const { WorkIntervalTimer } = require('./WorkIntervalTimer')

const TaskStatus = {
  COMPLETE: 'complete',
  PENDING: 'pending',
  INPROGRESS: 'inprogress',
  RETRY: 'retry',
  ERROR: 'error'
}

class TaskQueueServiceBase extends Logger {
  constructor(contextName, dbService, collectionName, config) {
    super(contextName, dbService.getLoggerConfig())
    this.__taskCollectionName = collectionName
    this.__dbService = dbService
    this.__taskCleanupTimer = new WorkIntervalTimer('TaskQueueServiceBase:CleanupTimer', config, 60 * 60)

    const defaultConf = {
      waitTime: 5 * 60 * 1000,
      retryWaitTime: 1 * 60 * 1000,
      maxRetry: 10
    }

    const finalConf = _.defaults({}, _.pick(config, _.keys(defaultConf)), defaultConf)

    this.__waitTime = _.max([finalConf.waitTime, 1 * 60 * 1000])
    this.__retryWaitTime = _.max([finalConf.retryWaitTime, 30 * 1000])
    this.__maxRetry = _.max([finalConf.maxRetry, 0])
  }

  async init() {
    this._logInfo(`Creating index lastUpdatedTs for collection ${this.__taskCollectionName}`)
    await this.__dbService.createIndex(this.__taskCollectionName, {
      lastUpdatedTs: 1
    })

    await this.__dbService.createIndex(this.__taskCollectionName, {
      taskStatus: 1
    })

    await this.__dbService.createIndex(this.__taskCollectionName, {
      taskStatus: 1,
      lastUpdatedTs: 1
    })

    await this.__dbService.createIndex(this.__taskCollectionName, {
      storeId: 1,
      dataKey: 1,
      taskStatus: 1
    })

    await this.__dbService.createIndex(this.__taskCollectionName, {
      storeId: 1,
      taskStatus: 1
    })

    this.__taskCleanupTimer.start(async () => {
      // Remove completed tasks before last 24 hours
      await this.__dbService.deleteMany(this.__taskCollectionName, {
        taskStatus: TaskStatus.COMPLETE,
        lastUpdatedTs: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      })

      // Remove errored tasks before last 3 days
      await this.__dbService.deleteMany(this.__taskCollectionName, {
        taskStatus: TaskStatus.ERROR,
        lastUpdatedTs: { $lt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }
      })
    })
  }

  async shutdown() {
    await this.__taskCleanupTimer.shutdown()
  }

  async getStat() {
    const [completed, incomplete] = await Promise.all([
      this.__dbService.aggregate(this.__taskCollectionName, [
        {
          $match: {
            lastUpdatedTs: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
            taskStatus: TaskStatus.COMPLETE
          }
        }, {
          $sort: { lastUpdatedTs: -1 }
        }, {
          $group: {
            _id: '$dataKey',
            taskData: { $first: '$taskData' }
          }
        }, {
          $group: {
            _id: '1',
            complete: { $sum: 1 }
          }
        }
      ]),
      this.__dbService.count(this.__taskCollectionName, {
        taskStatus: { $ne: TaskStatus.COMPLETE }
      })
    ])

    return {
      last24: {
        complete: _.get(completed, '0.complete', 0)
      },
      pending: incomplete
    }
  }

  async getNext(storeId = null) {
    const storeIdFilter = {}
    if (!_.isEmpty(storeId)) {
      storeIdFilter.storeId = storeId
    }

    const taskUpdateRec = await this.__dbService.findOneAndUpdate(
      this.__taskCollectionName, {
        ...storeIdFilter,
        $or: [
          {
            taskStatus: TaskStatus.PENDING
          }, {
            lastUpdatedTs: { $lte: new Date(Date.now() - this.__waitTime) },
            taskStatus: TaskStatus.INPROGRESS
          }, {
            lastRetryTs: { $lte: new Date(Date.now() - this.__retryWaitTime) },
            retryCount: { $lte: this.__maxRetry },
            taskStatus: TaskStatus.RETRY
          }
        ]
      }, {
        $set: {
          lastUpdatedTs: new Date(),
          taskStatus: TaskStatus.INPROGRESS
        }
      }, {
        projection: {
          taskData: 1,
          dataKey: 1,
          retryCount: 1
        }
      }
    )

    const taskId = _.get(taskUpdateRec, 'value._id', null)

    if (taskId) {
      return {
        taskId,
        dataKey: _.get(taskUpdateRec, 'value.dataKey', null),
        taskData: _.get(taskUpdateRec, 'value.taskData', null),
        retryCount: _.get(taskUpdateRec, 'value.retryCount', 0)
      }
    }

    return null
  }

  async _addTask(storeId, dataKey, taskData = null) {
    const taskKey = {
      storeId,
      dataKey,
      taskStatus: TaskStatus.PENDING
    }

    const timeNow = new Date()

    const setObj = {
      ...taskKey,
      lastUpdatedTs: timeNow,
      retryCount: 0
    }

    if (!_.isNull(taskData)) {
      setObj.taskData = taskData
    }

    const updateRes = await this.__dbService.findOneAndUpdate(
      this.__taskCollectionName, taskKey, {
        $setOnInsert: {
          createdTs: timeNow
        },
        $set: setObj
      }, {
        upsert: true,
        returnOriginal: false,
        projection: {
          _id: 1
        }
      }
    )

    const taskId = _.get(updateRes, 'value._id', null)

    return { taskId }
  }

  async __updateTaskStatus(taskIds, updateObj) {
    await this.__dbService.updateMany(this.__taskCollectionName, {
      _id: {
        $in: _.map(taskIds, id => ObjectId(id))
      }
    }, updateObj)
  }

  async getTaskStatus(storeId, taskId) {
    let objId = taskId
    if (typeof objId === 'string') {
      objId = ObjectId(objId)
    }

    const taskData = await this.__dbService.findOne(this.__taskCollectionName, {
      storeId,
      _id: objId
    }, {
      projection: {
        taskStatus: 1,
        lastUpdatedTs: 1,
        createdTs: 1
      }
    })

    return taskData
  }

  async markComplete(taskIds) {
    await this.__updateTaskStatus(taskIds, {
      $set: {
        lastUpdatedTs: new Date(),
        taskStatus: TaskStatus.COMPLETE
      }
    })
  }

  async markError(taskId2ErrorMap) {
    const batch = await this.__dbService.initBulkOp(this.__taskCollectionName)

    _.forOwn(taskId2ErrorMap, (errObj, taskId) => {
      batch.find({
        _id: ObjectId(taskId)
      }).updateOne({
        $set: {
          lastUpdatedTs: new Date(),
          taskStatus: TaskStatus.ERROR,
          error: errObj
        }
      })
    })

    await batch.execute()
  }

  async markRetry(taskId2ErrorMap) {
    const batch = await this.__dbService.initBulkOp(this.__taskCollectionName)

    _.forOwn(taskId2ErrorMap, (errObj, taskId) => {
      batch.find({
        _id: ObjectId(taskId)
      }).updateOne({
        $set: {
          lastRetryTs: new Date(),
          taskStatus: TaskStatus.RETRY,
          error: errObj
        },
        $inc: {
          retryCount: 1
        }
      })
    })

    await batch.execute()
  }
}

module.exports = {
  TaskQueueServiceBase
}