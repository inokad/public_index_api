const axios = require('axios').default
const _ = require('lodash')
const Logger = require('logdna')

class LogDNALogger {
  constructor(config) {
    this.__logdnaKey = _.get(config, 'logger.logdnaKey', null)
    this.__appName = _.get(config, 'configName', '--')
    this.__logDNAClient = null
  }

  async init() {
    let instanceId = '--'
    if (process.platform === 'linux') {
      try {
        const { data, status } = await axios.get('http://169.254.169.254/latest/meta-data/instance-id', {
          timeout: 2000
        })
        if (status === 200) {
          instanceId = data
        }
      } catch (e) {
        instanceId = '--'
      }
    }

    if (!_.isEmpty(this.__logdnaKey)) {
      this.__logDNAClient = Logger.createLogger(this.__logdnaKey, {
        tags: [`instance:${instanceId}`],
        app: this.__appName,
        index_meta: true
      })
    }
  }

  error(msg, meta) {
    if (this.__logDNAClient) {
      this.__logDNAClient.log(msg, {
        level: 'error', meta
      })
    }
  }

  info(msg, meta) {
    if (this.__logDNAClient) {
      this.__logDNAClient.log(msg, {
        level: 'info', meta
      })
    }
  }

  warn(msg, meta) {
    if (this.__logDNAClient) {
      this.__logDNAClient.log(msg, {
        level: 'warn', meta
      })
    }
  }

  debug(msg, meta) {
    if (this.__logDNAClient) {
      this.__logDNAClient.log(msg, {
        level: 'debug', meta
      })
    }
  }

  trace(msg, meta) {
    if (this.__logDNAClient) {
      this.__logDNAClient.log(msg, {
        level: 'trace', meta
      })
    }
  }

  fatal(msg, meta) {
    if (this.__logDNAClient) {
      this.__logDNAClient.log(msg, {
        level: 'fatal', meta
      })
    }
  }

  shutdown() {
    return new Promise((resolve, reject) => {
      if (this.__logDNAClient) {
        Logger.cleanUpAll((err) => {
          if (err) {
            reject()
          } else {
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  }
}

module.exports = {
  LogDNALogger
}