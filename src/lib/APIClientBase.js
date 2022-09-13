const _ = require('lodash')
const axios = require('axios').default
const { Logger } = require('./Logger')

class APIClientBase extends Logger {
  constructor(contextName, config, apiHost, additionalContext = {}, axiosOptions = {}) {
    super(contextName, config, additionalContext)
    this.__apiHost = apiHost
    this.__axiosClient = axios.create(axiosOptions)
  }

  async __restCall(method, callPath, postData = null, headers = {}) {
    if (_.isNull(this.__apiHost)) {
      throw new Error('API host not provided')
    }

    const url = new URL(callPath, this.__apiHost).toString()

    try {
      const axResult = await this.__axiosClient({
        method,
        url,
        headers,
        data: postData
      })

      return _.get(axResult, 'data')
    } catch (e) {
      const rspData = _.get(e, 'response.data')
      if (!_.isEmpty(rspData)) {
        const er = new Error(e.message)
        er.extra = { status: _.get(e, 'response.status'), error: rspData }
        throw er
      }

      throw new Error(e.message)
    }
  }

  async _post(callPath, postData, headers = {}) {
    const retVal = await this.__restCall('post', callPath, postData, headers)
    return retVal
  }

  async _get(callPath, headers = {}) {
    const retVal = await this.__restCall('get', callPath, null, headers)
    return retVal
  }

  async _delete(callPath, headers = {}) {
    const retVal = await this.__restCall('delete', callPath, null, headers)
    return retVal
  }
}

module.exports = {
  APIClientBase
}