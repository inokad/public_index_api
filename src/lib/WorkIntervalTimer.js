
const { Logger } = require('../lib/Logger')

class WorkIntervalTimer extends Logger {
  constructor(timerName, config, interval = 5) {
    super(timerName, config)
    this.__timer = null
    this.__timerCb = null
    this.__workInProgress = false
    this.__interval = interval
    this.__shutdownInProgress = false
  }


  start(workCb, finalizeCb = null) {
    if (!this.__timer) {
      this._logInfo('Starting timer')
      this.__shutdownInProgress = false

      this.__timerCb = async () => {
        try {
          if (!this.__workInProgress) {
            this.__workInProgress = true

            const currentRunContext = {}
            let continueToProcess = false
            do {
              // eslint-disable-next-line no-await-in-loop
              continueToProcess = await workCb(currentRunContext)
            } while (!this.__shutdownInProgress && continueToProcess)

            if (finalizeCb) {
              await finalizeCb(currentRunContext)
            }

            this.__workInProgress = false
          }
        } catch (e) {
          this.__workInProgress = false
          this._logErr(e)
        }
      }

      this.__timer = setInterval(this.__timerCb, this.__interval * 1000)

      return true
    }

    return false
  }

  isInProgress() {
    return this.__workInProgress
  }

  triggerImmediately() {
    if (this.__timerCb) {
      this.__timerCb()
    }
  }

  shutdown() {
    return new Promise((resolve) => {
      this._logInfo('Shutting down')
      if (this.__timer) {
        this.__shutdownInProgress = true
        const shutdownInterval = setInterval(() => {
          if (!this.__workInProgress) {
            clearInterval(this.__timer)
            this.__timer = null
            clearInterval(shutdownInterval)
            this._logInfo('Shutdowned')
            resolve()
          }
        }, 100)
      } else {
        this._logInfo('Shutdowned')
        resolve()
      }
    })
  }
}

module.exports = {
  WorkIntervalTimer
}