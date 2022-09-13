
const _ = require('lodash')
const Ajv = require('ajv')
const AjvErrors = require('ajv-errors')
const AjvMergePatch = require('ajv-merge-patch')
const schemaDraft06 = require('ajv/lib/refs/json-schema-draft-06.json')
const omitDeep = require('omit-deep-lodash')

class Validator {
  constructor(validationSchemas, validationOptions = {}) {
    const ajvOptions = _.defaults({
      schemas: validationSchemas
    }, validationOptions, {
      allErrors: true,
      jsonPointers: true,
      coerceTypes: true,
      useDefaults: true
    })

    this.__validator = new Ajv(ajvOptions)

    AjvErrors(this.__validator)

    AjvMergePatch(this.__validator)

    this.__validator.addMetaSchema(schemaDraft06)
  }

  validateWithSchema(schemaName, data) {
    const validator = this.__validator.getSchema(schemaName)

    if (!validator(data)) {
      const errorList = []

      const filteredErrors = _.reject(_.get(validator, 'errors', []), {
        keyword: 'if'
      })

      _.forEach(filteredErrors, (er) => {
        errorList.push(omitDeep(er, 'schemaPath'))
      })

      return errorList
    }

    return []
  }
}

module.exports = {
  Validator
}