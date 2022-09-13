const _ = require('lodash')
const { TransformerBase } = require('./TransformerBase')

class Transformer extends TransformerBase {
  constructor(config) {
    super('Transformer', config)
  }

  __getProductMedia(product) {
    const constructedMedia = []
    const productImages = _.get(product, 'media')
    _.forEach(productImages, (img) => {
      constructedMedia.push({
        url: img.url,
        colorId: img.variationId
      })
    })
    return constructedMedia
  }

  __getProductColors(product) {
    const constructedColors = []
    const productColors = _.get(product, 'variations')

    _.forEach(productColors, (color) => {
      constructedColors.push({
        id: _.get(color, 'id'),
        name: _.get(color, 'name'),
        swatchUrl: _.get(color, 'swatch')
      })
    })
    return constructedColors
  }

  __getProductPopularity(product) {
    const productPopularity = _.get(product, 'popularity')
    const type = _.get(productPopularity, 'type')

    let popularity = {}

    if (type === 'STAR') {
      popularity = {
        type: 1,
        data: {
          overallRating: _.get(productPopularity, 'data.overallRating'),
          maxRating: _.get(productPopularity, 'data.maxRating'),
          reviewCount: _.get(productPopularity, 'data.reviewCount'),
          ratingSummary: _.get(productPopularity, 'data.ratingSummary')
        }
      }
    } else if (type === 'LIKES') {
      popularity = {
        type: 2,
        data: {
          favLikeCount: _.get(productPopularity, 'data.favLikeCount')
        }
      }
    } else if (type === 'THUMBS') {
      popularity = {
        type: 3,
        data: {
          thumbsUpCount: _.get(productPopularity, 'data.thumbsUpCount'),
          thumbsDownCount: _.get(productPopularity, 'data.thumbsDownCount')
        }
      }
    }
    return popularity
  }

  __getProductSKUs(product) {
    const retVal = []

    const productSKUs = _.get(product, 'skus')

    _.forEach(productSKUs, (sku) => {
      const price = _.get(sku, 'price')
      if (_.isNull(price)) {
        this._logWarn(`No price info found for ${_.get(product, 'id')}. No SKUs are added`)
      } else {
        const skuRec = {
          price,
          colorId: _.get(sku, 'variationId')
        }

        if (!_.isEmpty(_.get(sku, 'availability'))) {
          skuRec.availability = _.get(sku, 'availability')
        }

        if (!_.isEmpty(_.get(sku, 'size'))) {
          skuRec.size = _.get(sku, 'size')
        }

        if (!_.isEmpty(_.get(sku, 'tags'))) {
          skuRec.customSkuTags = _.get(sku, 'size')
        }
        if (!_.isEmpty(_.get(sku, 'inventoryQuantity'))) {
          skuRec.inventoryQuantity = _.get(sku, 'inventoryQuantity')
        }

        if (!_.isEmpty(_.get(sku, 'initialPrice'))) {
          skuRec.initialPrice = _.get(sku, 'initialPrice')
        }

        if (!_.isEmpty(_.get(sku, 'condition'))) {
          skuRec.condition = _.get(sku, 'condition')
        }

        retVal.push(skuRec)
      }
    })

    return retVal
  }

  _buildRecord(product) {
    const productRec = {
      productId: _.get(product, 'id'),
      productUrl: _.get(product, 'url')
    }

    if (!_.isEmpty(_.get(product, 'name'))) {
      productRec.productName = _.get(product, 'name')
    }

    if (!_.isEmpty(_.get(product, 'slug'))) {
      productRec.productSlug = _.get(product, 'slug')
    }

    if (!_.isEmpty(_.get(product, 'gender'))) {
      productRec.gender = _.get(product, 'gender')
    }

    if (!_.isEmpty(_.get(product, 'brand'))) {
      productRec.brandName = _.get(product, 'brand')
    }

    if (!_.isEmpty(_.get(product, 'relatedIds'))) {
      productRec.relatedIds = _.get(product, 'relatedIds')
    }

    if (!_.isEmpty(_.get(product, 'tags'))) {
      productRec.customProductTags = _.get(product, 'tags')
    }

    if (!_.isEmpty(_.get(product, 'ageGroup'))) {
      productRec.ageGroup = _.get(product, 'ageGroup')
    }

    if (!_.isEmpty(_.get(product, 'productFeatures'))) {
      productRec.productFeatures = _.get(product, 'productFeatures')
    }

    if (!_.isEmpty(_.get(product, 'variations'))) {
      productRec.colors = this.__getProductColors(product)
    }

    if (!_.isEmpty(_.get(product, 'description'))) {
      productRec.productDescription = _.get(product, 'description')
    }

    if (!_.isEmpty(_.get(product, 'media'))) {
      productRec.media = this.__getProductMedia(product)
    }

    if (!_.isEmpty(_.get(product, 'fitInformation'))) {
      productRec.fitInformation = _.get(product, 'fitInformation')
    }

    if (!_.isEmpty(_.get(product, 'collections'))) {
      productRec.collections = _.get(product, 'collections')
    }

    if (!_.isEmpty(_.get(product, 'customUserData'))) {
      productRec.customUserData = _.get(product, 'customUserData')
    }

    if (!_.isEmpty(_.get(product, 'arrivalDateTs'))) {
      productRec.arrivalDateTs = _.get(product, 'arrivalDateTs')
    }

    if (!_.isEmpty(_.get(product, 'categories'))) {
      productRec.productCategories = _.get(product, 'categories')
    }

    if (!_.isEmpty(_.get(product, 'skus'))) {
      productRec.productSkus = this.__getProductSKUs(product)
    }

    if (!_.isEmpty(_.get(product, 'popularity'))) {
      productRec.productPopularity = this.__getProductPopularity(product)
    }

    return productRec
  }
}

module.exports = {
  Transformer: Transformer
}
