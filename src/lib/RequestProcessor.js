
const _ = require('lodash')
const errs = require('restify-errors')
const { Validator } = require('../lib/Validator')

class RequestProcessor {
  constructor(validationSchemas, validationOptions = {}) {
    this.__validator = new Validator(validationSchemas, validationOptions)
    this.__numItemsServing = 0
  }

  async serve(res, next, cb, data = null, schemaName = null) {
    this.__numItemsServing += 1

    if (!_.isEmpty(schemaName)) {
      const errorList = this.__validator.validateWithSchema(schemaName, data)

      if (!_.isEmpty(errorList)) {
        const er = new errs.InvalidArgumentError({
          info: {
            errors: errorList
          }
        }, 'Validation failure')

        er.toJSON = function toJSON() {
          const jsonData = {
            success: false,
            code: 'InvalidArgument',
            ...errs.info(this),
            message: this.message
          }

          return jsonData
        }

        const retVal = next(er)
        this.__numItemsServing -= 1
        return retVal
      }
    }

    let retVal = null

    try {
      const dataToSend = await cb(data)
      res.send(dataToSend)
      retVal = next()
    } catch (e) {
      console.error(e)
      if (e instanceof errs.NotFoundError) {
        e.toJSON = function toJSON() {
          return {
            success: false,
            code: 'NotFound',
            ...errs.info(this),
            message: this.message
          }
        }
        retVal = next(e)
      } else if (e instanceof errs.InvalidArgumentError) {
        e.toJSON = function toJSON() {
          return {
            success: false,
            code: 'InvalidArgument',
            ...errs.info(this),
            message: this.message
          }
        }
        retVal = next(e)
      } else {
        const internalEr = new errs.InternalServerError(e.message)
        internalEr.toJSON = function toJSON() {
          return {
            success: false,
            code: 'InternalServer',
            message: this.message
          }
        }
        retVal = next(internalEr)
      }
    }

    this.__numItemsServing -= 1
    return retVal
  }

  waitTillPendingRequestsDrain() {
    return new Promise((resolve) => {
      if (this.__numItemsServing > 0) {
        const shutdownInterval = setInterval(() => {
          if (this.__numItemsServing === 0) {
            clearInterval(shutdownInterval)
            resolve()
          }
        }, 100)
      } else {
        resolve()
      }
    })
  }
}

module.exports = {
  RequestProcessor
}
