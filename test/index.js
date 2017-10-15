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
        addOrgMembership: expect.createSpy()
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
      expect(github.orgs.addOrgMembership).toNotHaveBeenCalled()
    })

    it('invites new user to organization', async () => {
      // act
      await robot.receive(event)
      // assert
      expect(github.orgs.getOrgMembership).toThrow()
      expect(github.orgs.addOrgMembership).toHaveBeenCalledWith({
        org: event.payload.repository.owner.login,
        username: event.payload.pull_request.user.login,
        role: 'member'
      })
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
    })
  })
})
