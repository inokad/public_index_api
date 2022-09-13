const _ = require('lodash')
const errs = require('restify-errors')
const { ObjectId } = require('mongodb')
const { IndexerTaskQueueService } = require('../services/IndexerTaskQueueService')
const { RequestProcessor } = require('../lib/RequestProcessor')
const productSchema = require('../schemas/_product.json')

module.exports = async function indexRoute(server, dbService, confObj) {
  const config = {
    ...confObj
  }

  const taskService = new IndexerTaskQueueService(dbService, config)

  await taskService.init()

  const reqProc = new RequestProcessor([
    productSchema, {
      $id: 'deleteSchema',
      type: 'object',
      additionalProperties: false,
      required: [
        'id'
      ],
      properties: {
        id: {
          type: 'string',
          minLength: 1,
          maxLength: 50,
          errorMessage: 'id should be a string (max_length=50)'
        }
      }
    }, {
      $id: 'taskTrackingSchema',
      type: 'object',
      additionalProperties: false,
      required: [
        'id'
      ],
      properties: {
        id: {
          type: 'string',
          minLength: 24,
          maxLength: 24,
          pattern: '[0-9a-f]{24}',
          errorMessage: 'Malformed task Id. Please use a task id returned by the index API'
        }
      }
    }
  ])

  // ADD single product
  server.post('/1.3/products', async (req, res, next) => reqProc.serve(res, next, async (userData) => {
    const { taskId } = await taskService.queueIndexTask(_.get(req, 'store.storeId'), userData)
    return {
      success: true,
      taskId
    }
  }, req.body, '_product.json'))

  // DELETE single product
  server.del('/1.3/products/:id', async (req, res, next) => reqProc.serve(res, next, async (userData) => {
    const { taskId } = await taskService.queueDeleteTask(_.get(req, 'store.storeId'), userData.id)

    return {
      success: true,
      taskId
    }
  }, req.params, 'deleteSchema'))

  // Task Tracking
  server.get('/1.3/tasks/:id', async (req, res, next) => reqProc.serve(res, next, async (userData) => {
    if (ObjectId.isValid(userData.id)) {
      const taskData = await taskService.getTaskStatus(_.get(req, 'store.storeId'), userData.id)
      if (!_.isEmpty(taskData)) {
        const { taskStatus, lastUpdatedTs, createdTs } = taskData
        return {
          status: taskStatus,
          createdAt: createdTs,
          updatedAt: lastUpdatedTs
        }
      }
    }

    throw new errs.NotFoundError(`Task ${userData.id} not found in the system.`)
  }, req.params, 'taskTrackingSchema'))

  // Return a shutdown function
  return async () => {
    await reqProc.waitTillPendingRequestsDrain()
    await taskService.shutdown()
  }
}

/*
NEW
relatedIds
sortOrder
arrivalDateTs
collections
customUserData
customUserTags
fitInformation

/*
id => productId
url => productUrl
slug => productSlug
name => productName
brand => brandName
description => productDescription
features => productFeatures
categories => productCategories
gender
ageGroup
variations => colors
  id
  name
  swatch
media
  url
  variationId
skus => productSkus
  price
  variationId
  size
  promoPrice
  availability
tags  ==> customProductTags
popularity => productPopularity
  type
  data
*/