// use sentry.io for exception tracking
var Raven = require('raven')
Raven.config(`https://${process.env.SENTRY_KEY}@sentry.io/228941`).install()

module.exports = (robot) => {
  robot.on('pull_request.closed', inviteMember)

  async function inviteMember (context) {
    const isMerged = context.payload.pull_request.merged
    const isOrg = context.payload.repository.owner.type === 'Organization'

    if (context.isBot || !isMerged || !isOrg) {
      robot.log('This pull request belongs to a non-organization repo, has made by a bot user, or has been closed without merging. :(')
      return
    }

    const payload = {
      org: context.payload.repository.owner.login,
      username: context.payload.pull_request.user.login,
      role: 'member'
    }

    // check if user is already part of organization
    // the api call throws if user is not part of org
    try {
      await context.github.orgs.getOrgMembership(payload)
      robot.log(`Cannot invite ${payload.username} because they already been invited to ${payload.org}!`)
      return
    } catch (e) {
      // if user is not part of org, invite them
      await context.github.orgs.addOrgMembership(payload)
    }

  }
}
