# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2017-10-25
### Added
- Enable option in config to add contributors as outside collaborators

### Fixed
- Make test hierarchy prettier

## [1.2.2] - 2017-10-25
### Fixed
- Correct the behavior of blocking bot events. Used to check for PRs merged by bots, but now instead checks for PRs authored by bots

## [1.2.1] - 2017-10-21
### Fixed
- Fix the behavior of adding contributor directly to team (it would always add the contributor to team as member regardless of organization membership)
- Fix typo in README.md involving format of `invite-contributors.yml`

## [1.2.0] - 2017-10-19
### Changed
- Change name from `badge` to `invite-contributors` for clarity. **NOTE: This breaks previous installations that had a `badge.yml` because name has been changed to `invite-contributors.yml`**
- Change behavior when contributor is already part of organization and bot is set to invite users to teams. Now takes no action instead of inviting user if they were not part of team.

## [1.1.0] - 2017-10-16
### Added
- Add error tracking with Sentry.io.
- Enable Continuous Integration with Travis.
- Allow users to add new contributors directly to a team within the organization.

## [1.0.0] - 2017-10-10
### Added
- Create base case functionality. See [original GitHub issue](https://github.com/reactiveui/ReactiveUI/issues/1501).