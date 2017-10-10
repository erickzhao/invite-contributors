module.exports = (robot) => {
  console.log('App started...')

  robot.on('pull_request.closed', inviteMember);
  
  async function inviteMember(context) {
      
    const isMerged = context.payload.pull_request.merged;
    const isOrg = context.payload.repository.owner.type === 'Organization';

    if (context.isBot || !isMerged || !isOrg) {
      robot.log('This pull request belongs to a non-organization repo, has made by a bot user, or has been closed without merging. :(')
      return;
    }

    const memberPayload = {
      org: context.payload.repository.owner.login,
      username: context.payload.pull_request.user.login,
      role: 'member'
    }

    let response;
    try {
      response = await context.github.orgs.addOrgMembership(memberPayload);

      if (response.state === 'pending') {
        robot.log('User is already in organization! :)')
      } else {
        robot.log('User has been added to the organization! :)');
      }

    } catch(e) {
      response = e;
      robot.log(e);
      robot.log('Unable to add user to organization. :(');
    }
  }
  
};