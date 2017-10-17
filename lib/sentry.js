function install () {
  // use Sentry for exception tracking (only on production)
  if (process.env.NODE_ENV !== 'production') {
    return
  }
  var Raven = require('raven')
  Raven.config(`https://${process.env.SENTRY_KEY}@sentry.io/228941`).install()
}

module.exports = { install }
