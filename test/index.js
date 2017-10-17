const expect = require('expect')
const {createRobot} = require('probot')
const plugin = require('..')

describe('badge', () => {
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
          data: [
            {
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
            }
          ]
        })),
        getTeamMembership: expect.createSpy().andThrow(new Error('Not Found')),
        addTeamMembership: expect.createSpy()
      },
      repos: {
        getContent: expect.createSpy().andThrow(new Error('Not Found'))
      }
    }

    robot.auth = () => Promise.resolve(github)
  })

  describe('when PR is merged', () => {
    const event = require('./fixtures/merge_pr.json')

    it('terminates if user was already in organization', async() => {
      // arrange
      github.orgs.getOrgMembership = expect.createSpy().andReturn(Promise.resolve())

      // act
      await robot.receive(event)

      // assert
      expect(github.repos.getContent).toThrow()

      expect(github.orgs.getOrgMembership).toHaveBeenCalled()
      expect(github.orgs.addOrgMembership).toNotHaveBeenCalled()

      expect(github.orgs.getTeamMembership).toNotHaveBeenCalled()
      expect(github.orgs.addTeamMembership).toNotHaveBeenCalled()
    })

    it('invites new user to organization if no config', async () => {
      // act
      await robot.receive(event)

      // assert
      expect(github.repos.getContent).toThrow()

      expect(github.orgs.getOrgMembership).toThrow()
      expect(github.orgs.addOrgMembership).toHaveBeenCalledWith({
        org: event.payload.repository.owner.login,
        username: event.payload.pull_request.user.login,
        role: 'member'
      })

      expect(github.orgs.getTeamMembership).toNotHaveBeenCalled()
      expect(github.orgs.addTeamMembership).toNotHaveBeenCalled()
    })

    it('invites new user to organization if no team in config', async () => {
      // arrange
      github.repos.getContent = expect.createSpy().andReturn(Promise.resolve({
        data: {
          content: Buffer.from(` `).toString('base64')
        }
      }))

      // act
      await robot.receive(event)

      // assert
      expect(github.repos.getContent).toHaveBeenCalledWith({
        owner: event.payload.repository.owner.login,
        repo: event.payload.repository.name,
        path: '.github/badge.yml'
      })

      expect(github.orgs.getOrgMembership).toThrow()
      expect(github.orgs.addOrgMembership).toHaveBeenCalledWith({
        org: event.payload.repository.owner.login,
        username: event.payload.pull_request.user.login,
        role: 'member'
      })
      expect(github.orgs.getTeamMembership).toNotHaveBeenCalled()
      expect(github.orgs.addTeamMembership).toNotHaveBeenCalled()
    })

    it('invites new user to team if specified in config', async () => {
      // arrange
      github.repos.getContent = expect.createSpy().andReturn(Promise.resolve({
        data: {
          content: Buffer.from(`team: Justice League`).toString('base64')
        }
      }))

      // act
      await robot.receive(event)

      // assert
      expect(github.repos.getContent).toHaveBeenCalledWith({
        owner: event.payload.repository.owner.login,
        repo: event.payload.repository.name,
        path: '.github/badge.yml'
      })
      expect(github.orgs.getTeamMembership).toThrow()
      expect(github.orgs.addTeamMembership).toHaveBeenCalledWith({
        id: 1,
        username: event.payload.pull_request.user.login,
        role: 'member'
      })
      expect(github.orgs.getOrgMembership).toNotHaveBeenCalled()
      expect(github.orgs.addOrgMembership).toNotHaveBeenCalled()
    })
  })

  describe('when PR is closed w/o merging', () => {
    const event = require('./fixtures/close_pr.json')
    it('takes no action', async () => {
      // act
      await robot.receive(event)

      // assert
      expect(github.orgs.getOrgMembership).toNotHaveBeenCalled()
      expect(github.orgs.addOrgMembership).toNotHaveBeenCalled()
      expect(github.orgs.getTeamMembership).toNotHaveBeenCalled()
      expect(github.orgs.addTeamMembership).toNotHaveBeenCalled()
    })
  })
})
