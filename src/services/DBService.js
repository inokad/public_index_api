const _ = require('lodash')
const { MongoClient, ObjectId } = require('mongodb')
const { Logger } = require('../lib/Logger')

class DBService extends Logger {
  constructor(config) {
    super('DBService', config)
    this.__dbConnectionUri = config.mongoUrl
    this.__dbName = config.dbName
    this.__db = null
    this.__client = null
  }

  isConnected() {
    if (this.__client) {
      return this.__client.isConnected()
    }

    return false
  }

  async connect() {
    this._logInfo('Connecting the DB...')

    // Driver handles the connection pool problem
    this.__client = await MongoClient.connect(this.__dbConnectionUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    })

    this._logInfo('DB connection successful')

    this.__db = this.__client.db(this.__dbName)
  }

  async disconnect() {
    if (this.__client) {
      this.__db = null

      this._logInfo('DB disconnecting...')

      await this.__client.close()

      this._logInfo('Disconnected from the DB')

      this.__client = null
    }
  }

  async distinct(collection, field, query, options) {
    this._checkDbConnected()

    const retVal = await this.__db.collection(collection).distinct(field, query, options)

    return retVal
  }

  async initBulkOp(collection) {
    this._checkDbConnected()

    const retVal = await this.__db.collection(collection).initializeUnorderedBulkOp()

    return retVal
  }

  async insertMany(collection, data, options = {}) {
    this._checkDbConnected()

    const retVal = await this.__db.collection(collection).insertMany(data, options)

    return retVal
  }

  async aggregate(collection, pipeline, opts = {}) {
    this._checkDbConnected()

    const retVal = await this.__db.collection(collection).aggregate(pipeline, opts).toArray()

    return retVal
  }

  _checkDbConnected() {
    if (!this.__db) {
      throw new Error('DB connection has not yet established')
    }
  }

  async createIndex(collection, indexDef, options = {}) {
    this._checkDbConnected()

    const retVal = await this.__db.collection(collection).createIndex(indexDef, options)

    return retVal
  }

  async findOneAndUpdate(collection, query, update, options = {}) {
    this._checkDbConnected()

    const retVal = await this.__db.collection(collection).findOneAndUpdate(query, update, options)

    return retVal
  }

  async findOneAndReplace(collection, query, update, options = {}) {
    this._checkDbConnected()

    const retVal = await this.__db.collection(collection).findOneAndReplace(query, update, options)

    return retVal
  }

  async createCollection(collection, options = {}) {
    this._checkDbConnected()
    await this.__db.createCollection(collection, options)
  }

  async remove(collection, query, options = {}) {
    this._checkDbConnected()

    const retVal = await this.__db.collection(collection).deleteOne(query, options)

    return retVal
  }

  async deleteMany(collection, query, options = {}) {
    this._checkDbConnected()

    const retVal = await this.__db.collection(collection).deleteMany(query, options)

    return retVal
  }

  async updateOne(collection, query, update, options = {}) {
    this._checkDbConnected()

    const retVal = await this.__db.collection(collection).updateOne(query, update, options)

    return retVal
  }

  async updateMany(collection, query, update, options = {}) {
    this._checkDbConnected()

    const retVal = await this.__db.collection(collection).updateMany(query, update, options)

    return retVal
  }

  async findOneById(collection, id, options = {}) {
    this._checkDbConnected()

    let objId = id
    if (typeof objId === 'string') {
      objId = ObjectId(objId)
    }

    const retVal = await this.__db.collection(collection).findOne({ _id: objId }, options)

    return retVal
  }

  async findOne(collection, query, options = {}) {
    this._checkDbConnected()

    const retVal = await this.__db.collection(collection).findOne(query, options)

    return retVal
  }

  async findOneByTs(collection, query, tsField, options = {}) {
    this._checkDbConnected()

    const dataSet = await this.__db
      .collection(collection)
      .find(query, options)
      .sort({ [tsField]: -1 })
      .limit(1)

    if (!_.isEmpty(dataSet)) {
      return dataSet[0]
    }

    return null
  }

  async findManySorted(collection, query, sort = {}, options = {}) {
    this._checkDbConnected()

    const dataSet = await this.__db.collection(collection).find(query, options).sort(sort).toArray()

    return dataSet
  }

  async findMany(collection, query, options = {}) {
    this._checkDbConnected()

    const dataSet = await this.__db.collection(collection).find(query, options).toArray()

    return dataSet
  }

  async count(collection, query, options = {}) {
    this._checkDbConnected()

    let dataSetCount = 0
    if (_.isEmpty(query)) {
      dataSetCount = await this.__db.collection(collection).estimatedDocumentCount(options)
    } else {
      dataSetCount = await this.__db.collection(collection).countDocuments(query, options)
    }

    return dataSetCount
  }

  async findManyWithCount(collection, query, options = {}) {
    this._checkDbConnected()

    const dataSet = await this.__db.collection(collection).find(query, options)

    return {
      dataSet: await dataSet.toArray(),
      count: await dataSet.count()
    }
  }
}

module.exports = {
  DBService
}
