module.exports = {
  apps: [{
    name: 'public_index_api',
    namespace: 'public_index',
    script: './server.js',
    args: 'public_index_api',
    combine_logs: true,
    cwd: '/etc/company/public_index_api/',
    instances: 2,
    // wait_ready: true,
    listen_timeout: 180000,
    kill_timeout: 120000
  },
  {
    name: 'api_indexer',
    namespace: 'public_index',
    script: './indexer.js',
    args: 'public_index_api',
    combine_logs: true,
    cwd: '/etc/company/public_index_api/',
    instances: 2,
    // wait_ready: true,
    listen_timeout: 180000,
    kill_timeout: 120000
  }
  ]
}