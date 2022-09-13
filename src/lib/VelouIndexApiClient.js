const { APIClientBase } = require('./APIClientBase')

class IndexApiClient extends APIClientBase {
  constructor(config, apiHost) {
    super('IndexApiClient', config, apiHost)
  }

  async index(productData) {
    const retVal = await this._post('products', productData, {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    })

    return retVal
  }

  async delete(productCode) {
    const retVal = await this._delete(`products/${productCode}`, {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    })

    return retVal
  }
}

module.exports = {
  IndexApiClient
}
