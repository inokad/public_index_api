const indexRoute = require('./src/routes/index_api')
const healthRoute = require('./src/routes/health')
const serverSetup = require('./src/server_setup')

serverSetup('serverPort', async (server, dbService, config) => {
  const indexShutdown = await indexRoute(server, dbService, config)
  const healthShutdown = await healthRoute(server)

  return async () => {
    await healthShutdown()
    await indexShutdown()
  }
})