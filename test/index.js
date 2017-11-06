const expect = require('expect')
const {
  createRobot
} = require('probot')
const plugin = require('..')

describe('invite-contributors', () => {
  let robot
  let github

  beforeEach(() => {
    robot = createRobot()
    plugin(robot)

    // mock github api
    github = {
      orgs: {
        getOrgMembership: expect.createSpy().andThrow(new Error('Not Found')),
        addOrgMembership: expect.createSpy(),
        getTeams: expect.createSpy().andReturn(Promise.resolve({
          data: [{
            'id': 1,
            'url': 'https://api.github.com/teams/1',
            'name': 'Justice League',
            'slug': 'justice-league',
            'description': 'A great team.',
            'privacy': 'closed',
            'permission': 'admin',
            'members_url': 'https://api.github.com/teams/1/members{/member}',
            'repositories_url': 'https://api.github.com/teams/1/repos',
            'parent': null
          }]
        })),
        addTeamMembership: expect.createSpy()
      },
      repos: {
        getContent: expect.createSpy().andThrow(new Error('Not Found')),
        addCollaborator: expect.createSpy()
      }
    }

    robot.auth = () => Promise.resolve(github)
  })

  describe('when PR authored by user is merged', () => {
    // declare fixtures
    const event = require('./fixtures/merge_pr.json')

    const orgPayload = {
      org: event.payload.repository.owner.login,
      username: event.payload.pull_request.user.login,
      role: 'member'
    }

    const configPayload = {
      owner: event.payload.repository.owner.login,
      repo: event.payload.repository.name,
      path: '.github/invite-contributors.yml'
    }

    const teamPayload = {
      id: 1,
      username: event.payload.pull_request.user.login,
      role: 'member'
    }

    const repoPayload = {
      owner: event.payload.repository.owner.login,
      repo: event.payload.repository.name,
      username: event.payload.pull_request.user.login
    }

    describe('and there is no config', () => {
      it('terminates if user was already in organization', async() => {
        // arrange
        github.orgs.getOrgMembership = expect.createSpy().andReturn(Promise.resolve())

        // act
        await robot.receive(event)

        // assert
        expect(github.orgs.getOrgMembership).toHaveBeenCalled()
        expect(github.orgs.addOrgMembership).toNotHaveBeenCalled()
        expect(github.orgs.addTeamMembership).toNotHaveBeenCalled()
      })

      it('invites new user to organization', async() => {
        // act
        await robot.receive(event)

        // assert
        expect(github.repos.getContent).toThrow()

        expect(github.orgs.getOrgMembership).toThrow()
        expect(github.orgs.addOrgMembership).toHaveBeenCalledWith(orgPayload)
      })
    })

    describe('and config specifies team', () => {
      it('terminates if user was already in organization', async() => {
        // arrange
        github.repos.getContent = expect.createSpy().andReturn(Promise.resolve({
          data: {
            content: Buffer.from(`team: Justice League`).toString('base64')
          }
        }))
        github.orgs.getOrgMembership = expect.createSpy().andReturn(Promise.resolve())

        // act
        await robot.receive(event)

        // assert
        expect(github.orgs.getOrgMembership).toHaveBeenCalled()
        expect(github.orgs.addOrgMembership).toNotHaveBeenCalled()
        expect(github.orgs.addTeamMembership).toNotHaveBeenCalled()
      })

      it('terminates if user in org but valid team name specified', async() => {
        // arrange
        github.repos.getContent = expect.createSpy().andReturn(Promise.resolve({
          data: {
            content: Buffer.from(`team: NOT Justice League`).toString('base64')
          }
        }))

        // act
        await robot.receive(event)

        // assert
        expect(github.repos.getContent).toHaveBeenCalledWith(configPayload)
        expect(github.orgs.getOrgMembership).toHaveBeenCalled()
        expect(github.orgs.addOrgMembership).toHaveBeenCalledWith(orgPayload)
      })

      it('invites new user to team if valid team name specified', async() => {
        // arrange
        github.repos.getContent = expect.createSpy().andReturn(Promise.resolve({
          data: {
            content: Buffer.from(`team: Justice League`).toString('base64')
          }
        }))

        // act
        await robot.receive(event)

        // assert
        expect(github.repos.getContent).toHaveBeenCalledWith(configPayload)
        expect(github.orgs.getOrgMembership).toThrow()
        expect(github.orgs.addOrgMembership).toNotHaveBeenCalled()
        expect(github.orgs.addTeamMembership).toHaveBeenCalledWith(teamPayload)
      })

      it('invites new user to organization if nothing specified', async() => {
        // arrange
        github.repos.getContent = expect.createSpy().andReturn(Promise.resolve({
          data: {
            content: Buffer.from(` `).toString('base64')
          }
        }))

        // act
        await robot.receive(event)

        // assert
        expect(github.repos.getContent).toHaveBeenCalledWith(configPayload)
        expect(github.orgs.getOrgMembership).toThrow()
        expect(github.orgs.addOrgMembership).toHaveBeenCalledWith(orgPayload)
      })

      it('invites new user to organization if team name invalid', async() => {
        // arrange
        github.repos.getContent = expect.createSpy().andReturn(Promise.resolve({
          data: {
            content: Buffer.from(`team: NOT Justice League`).toString('base64')
          }
        }))

        // act
        await robot.receive(event)

        // assert
        expect(github.repos.getContent).toHaveBeenCalledWith(configPayload)
        expect(github.orgs.getOrgMembership).toThrow()
        expect(github.orgs.addOrgMembership).toHaveBeenCalledWith(orgPayload)
      })
    })

    describe('and config has outside contributor flag', () => {
      it('terminates if user was already inside organization', async() => {
        // arrange
        github.repos.getContent = expect.createSpy().andReturn(Promise.resolve({
          data: {
            content: Buffer.from(`isOutside: true`).toString('base64')
          }
        }))
        github.orgs.getOrgMembership = expect.createSpy().andReturn(Promise.resolve())

        // act
        await robot.receive(event)

        // assert
        expect(github.repos.getContent).toHaveBeenCalledWith(configPayload)
        expect(github.orgs.getOrgMembership).toHaveBeenCalled()
        expect(github.repos.addCollaborator).toNotHaveBeenCalled()
      })

      it('invites user as outside collaborator if flag is true', async() => {
        // arrange
        github.repos.getContent = expect.createSpy().andReturn(Promise.resolve({
          data: {
            content: Buffer.from(`isOutside: true`).toString('base64')
          }
        }))

        // act
        await robot.receive(event)

        // assert
        expect(github.repos.getContent).toHaveBeenCalledWith(configPayload)
        expect(github.orgs.getOrgMembership).toThrow()
        expect(github.repos.addCollaborator).toHaveBeenCalledWith(repoPayload)
      })

      it('invites user to organization if flag is false', async() => {
        // arrange
        github.repos.getContent = expect.createSpy().andReturn(Promise.resolve({
          data: {
            content: Buffer.from(`isOutside: false`).toString('base64')
          }
        }))

        // act
        await robot.receive(event)

        // assert
        expect(github.repos.getContent).toHaveBeenCalledWith(configPayload)
        expect(github.orgs.getOrgMembership).toHaveBeenCalled()
        expect(github.orgs.addOrgMembership).toHaveBeenCalledWith(orgPayload)
        expect(github.repos.addCollaborator).toNotHaveBeenCalled()
      })

      it('ignores team name if flag is true', async() => {
        // arrange
        github.repos.getContent = expect.createSpy().andReturn(Promise.resolve({
          data: {
            content: Buffer.from(
              `
              isOutside: true
              team: Justice League
              `).toString('base64')
          }
        }))

        // act
        await robot.receive(event)

        // assert
        expect(github.repos.getContent).toHaveBeenCalledWith(configPayload)
        expect(github.orgs.getOrgMembership).toThrow()
        expect(github.orgs.addTeamMembership).toNotHaveBeenCalled()
        expect(github.repos.addCollaborator).toHaveBeenCalledWith(repoPayload)
      })
    })

    describe('when PR authored by bot is merged', () => {
      const event = require('./fixtures/merge_bot.json')
      it('takes no action', async() => {
        // act
        await robot.receive(event)

        // assert
        expect(github.repos.getContent).toNotHaveBeenCalled()
        expect(github.orgs.getOrgMembership).toNotHaveBeenCalled()
      })
    })
  })

  describe('when PR is closed w/o merging', () => {
    const event = require('./fixtures/close_pr.json')
    it('takes no action', async() => {
      // act
      await robot.receive(event)

      // assert
      expect(github.repos.getContent).toNotHaveBeenCalled()
      expect(github.orgs.getOrgMembership).toNotHaveBeenCalled()
    })
  })
})
