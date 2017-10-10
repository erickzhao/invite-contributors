module.exports = (robot) => {
  console.log('App started...')

  robot.on('pull_request.closed', inviteMember);

  
  async function inviteMember(context) {
      
    const isMerged = context.payload.pull_request.merged;
    const isOrg = context.payload.pull_request.head.repo.owner.type === 'Organization';

    if (context.isBot || !isMerged || !isOrg) {
      robot.log('This pull request belongs to a non-organization repo, has made by a bot user, or has been closed without merging. :(')
      return;
    }

    const memberPayload = {
      org: context.payload.pull_request.head.repo.owner.login,
      username: context.payload.pull_request.user.login,
      role: 'member'
    }

    robot.log('This pull request has been merged! :)');

    //const data = await context.github.orgs.addOrgMembership(memberPayload).data;

    //robot.log(data);
  }
  
};