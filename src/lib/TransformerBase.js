const _ = require('lodash')
const { convert } = require('html-to-text')
const { Logger } = require('./Logger')

class TransformerBase extends Logger {
  constructor(
    contextName, config, storeId, additionalContext = {}
  ) {
    super(contextName, config, additionalContext)
    this.__storeId = storeId
  }

  _stripHTML(text) {
    let processedText = convert(text)
    processedText = _.replace(processedText, /\\\\n/g, '\n')
    processedText = _.replace(processedText, /\\\\t/g, '\t')
    return processedText
  }

  _addTag(attribMap, destArray, keyName) {
    if (attribMap[keyName]) {
      _.forEach(attribMap[keyName], (attr) => {
        destArray.push(`${keyName}:${_.trim(attr)}`)
      })
    }
  }

  getStoreId() {
    return this.__storeId
  }

  _buildRecord() {
    return {}
  }

  createProductRecord(product) {
    return this._buildRecord(product)
  }
}


module.exports = {
  TransformerBase
}