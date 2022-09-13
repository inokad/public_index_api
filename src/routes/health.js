
module.exports = async function health(server) {
  server.get('/health', async (req, res, next) => {
    res.send(200, 'OK')
    return next()
  })
}