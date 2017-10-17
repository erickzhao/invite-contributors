var sentry = require('./lib/sentry.js')

sentry.install()

module.exports = (robot) => {
  robot.on('pull_request.closed', inviteMember)

  async function inviteMember (context) {
    const isMerged = context.payload.pull_request.merged
    const isOrg = context.payload.repository.owner.type === 'Organization'

    // Terminate if we can't invite user to organization
    if (context.isBot || !isMerged || !isOrg) {
      return
    }

    // Get user settings
    let team
    try {
      team = (await context.config('badge.yml')).team
    } catch (e) {
      team = null
    }

    // Invite to team. If no team defined, invite to organization.
    if (team) {
      const teamId = await findTeamId(context, context.payload.repository.owner.login, team)
      await inviteToTeam(context, teamId, context.payload.pull_request.user.login)
    } else {
      await inviteToOrg(context, context.payload.repository.owner.login, context.payload.pull_request.user.login)
    }
  }

  async function findTeamId (context, org, teamName) {
    // get all pages from paginated api call and flatten data
    const teams = (await context.github.orgs.getTeams({org: org})).data
    const team = teams.find(t => t.name === teamName || t.slug === teamName)
    return team && team.id
  }

  async function inviteToOrg (context, org, username) {
    const payload = {
      org: org,
      username: username,
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
      robot.log(`${payload.username} has been invited to ${payload.org}!`)
    }
  }

  async function inviteToTeam (context, teamId, username) {
    const payload = {
      id: teamId,
      username: username,
      role: 'member'
    }

    // check if user is already part of team
    // the api call throws if user is not part of team
    try {
      await context.github.orgs.getTeamMembership(payload)
      robot.log(`Cannot invite ${payload.username} because they already a part of the team!`)
      return
    } catch (e) {
      // if user is not part of team, invite them
      await context.github.orgs.addTeamMembership(payload)
      robot.log(`${payload.username} has been invited to the team!`)
    }
  }
}
