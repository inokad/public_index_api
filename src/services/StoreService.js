const _ = require('lodash')
const { Logger } = require('mongodb/lib/core')
const { IndexApiClient } = require('../lib/IndexApiClient')

const COLL_STORES = 'stores'

class StoreService extends Logger {
  constructor(dbService, config) {
    super('StoreService', config)
    this.__dbService = dbService
    this.__config = config
    this.__apiClients = {}
  }

  async init() {
    await this.__refreshFetchers()
  }

  async __refreshFetchers() {
    const stores = await this.__dbService.findMany(COLL_STORES, {
      active: true
    })

    _.forEach(stores, (st) => {
      const indexAPI = _.get(st, 'indexAPI')
      const _id = _.get(st, '_id')

      this.__apiClients[_id] = new IndexApiClient(this.__config, indexAPI)
    })
  }

  async getActiveStoreIds() {
    const stores = await this.__dbService.findMany(COLL_STORES, {
      active: true
    })

    const storeNames = []
    _.forEach(stores, (store) => {
      storeNames.push(_.get(store, '_id'))
    })
    return storeNames
  }

  getIndexAPIClient(storeId) {
    return this.__apiClients[storeId] || null
  }
}

module.exports = {
  StoreService
}
