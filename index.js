module.exports = (robot) => {
  robot.on('pull_request.closed', inviteMember)

  async function inviteMember (context) {
    const isUser = context.payload.pull_request.user.type === 'User'
    const isMerged = context.payload.pull_request.merged
    const isOrg = context.payload.repository.owner.type === 'Organization'

    // Terminate if we can't invite user to organization
    if (!isUser || !isMerged || !isOrg) {
      return
    }

    // Get user settings
    let config
    try {
      // attempt to find teamId if team exists
      config = (await context.config('invite-contributors.yml'))
      config.teamId = await findTeamId(context, context.payload.repository.owner.login, config.team)
    } catch (e) {
      // no config detected or teamId not found
    }
    // Invite to team. If no team defined, invite to organization.
    if (config && config.isOutside) {
      await inviteOutsideCollaboratorToRepo(context, config)
    } else if (config && config.teamId) {
      await inviteToTeam(context, config)
    } else {
      await inviteToOrg(context)
    }
  }

  async function findTeamId (context, org, teamName) {
    // get all pages from paginated api call and flatten data
    const teams = (await context.github.orgs.getTeams({org: org})).data
    const team = teams.find(t => t.name === teamName || t.slug === teamName)
    return team && team.id
  }

  async function inviteToOrg (context) {
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
      robot.log(`${payload.username} has been invited to ${payload.org}!`)
    }
  }

  async function inviteToTeam (context, config) {
    const orgPayload = {
      org: context.payload.repository.owner.login,
      username: context.payload.pull_request.user.login,
      role: 'member'
    }
    const teamPayload = {
      id: config.teamId,
      username: context.payload.pull_request.user.login,
      role: 'member'
    }

    // check if user is already part of team
    // the api call throws if user is not part of team
    try {
      await context.github.orgs.getOrgMembership(orgPayload)
      robot.log(`Cannot invite ${orgPayload.username} to team #${teamPayload.id} because they already been invited to ${orgPayload.org}!`)
      return
    } catch (e) {
      // if user is not part of org, invite them
      await context.github.orgs.addTeamMembership(teamPayload)
      robot.log(`${teamPayload.username} has been invited to team#${teamPayload.id} in ${orgPayload.org}!`)
    }
  }

  async function inviteOutsideCollaboratorToRepo (context) {
    const orgPayload = {
      org: context.payload.repository.owner.login,
      username: context.payload.pull_request.user.login,
      role: 'member'
    }
    const repoPayload = {
      owner: context.payload.repository.owner.login,
      repo: context.payload.repository.name,
      username: context.payload.pull_request.user.login
    }

    try {
      await context.github.orgs.getOrgMembership(orgPayload)
      robot.log(`Cannot add ${orgPayload.username} as outside collaborator because they already been invited to ${orgPayload.org}!`)
      return
    } catch (e) {
      // if user is not part of org, invite them
      await context.github.repos.addCollaborator(repoPayload)
      robot.log(`${repoPayload.username} has been invited to ${repoPayload.repo}!`)
    }
  }
}
