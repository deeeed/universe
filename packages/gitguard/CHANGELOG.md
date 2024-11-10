# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]


## [0.4.0] - 2024-11-10
- docs(gitguard): update changelog with smart package split detection feature ([b9397f1](https://github.com/deeeed/universe/commit/b9397f1dfbac509d180323a69df2e0f230838ba0))
- feat(gitguard): add smart package split detection in analyze command ([92a1ae8](https://github.com/deeeed/universe/commit/92a1ae8f4ef4dc22f833876e27b70af807f74074))
- refactor(commit): consolidate AI controllers and enhance commit split suggestions (#24) ([2665ebb](https://github.com/deeeed/universe/commit/2665ebb754a4adee4b7b70a160646294fc8d365c))
- refactor(gitguard): modularize commit and branch handling with enhanced e2e logging and security configuration (#22) ([548c5d6](https://github.com/deeeed/universe/commit/548c5d67449674864a0e50f2155252b2c6fc1563))
- feat/branchcommands (#19) ([95a5bbd](https://github.com/deeeed/universe/commit/95a5bbd90b8d8120adb30a69d0d1e567309b3e0b))

## [0.3.2] - 2024-11-06
- feat(gitguard): add monorepoPatterns to init command configuration ([11995bd](https://github.com/deeeed/universe/commit/11995bdc661d9426b1af84fe80ac36806fca3011))
- feat(cli): add commit option to analyze command ([c8755f5](https://github.com/deeeed/universe/commit/c8755f50198df1efa820f20af41aa282822445c2))


## [0.3.1] - 2024-11-04
- improve analyze command flow and enhance prompt handling ([e7bf9cf](https://github.com/deeeed/universe/commit/e7bf9cf36ce4a22cee5dc3448d64ccf830a85573))
- refactor(gitguard): change hook activation condition to rely on explicit GITGUARD environment variable ([83b6660](https://github.com/deeeed/universe/commit/83b66603bd2530f8407a3d01c8306a8004952b86))
- feat(gitguard): dont activate when quiet mode is activated ([69a8644](https://github.com/deeeed/universe/commit/69a8644c693e3cc7569ba70a3d32fcf5fbf0107d))
- refactor(gitguard/hooks): enhance commit preparation with workspace navigation ([3207e58](https://github.com/deeeed/universe/commit/3207e58473aa3b662f8e341f9b72b2b55e1451b2))
- fix(gitguard): trim whitespace in commit messages ([027aa79](https://github.com/deeeed/universe/commit/027aa79b9cb6c4ad60f5c455edc1cb10fd540eec))
- handle empty input properly in prepare-commit hook ([0527d5f](https://github.com/deeeed/universe/commit/0527d5f2ac35513d74b063156ee3b295dadafb42))



## [0.3.0] - 2024-11-04

### Changed
- inititial version.

[unreleased]: https://github.com/deeeed/universe/compare/@siteed/gitguard@0.4.0...HEAD
[0.4.0]: https://github.com/deeeed/universe/compare/@siteed/gitguard@0.3.2...@siteed/gitguard@0.4.0
[0.3.2]: https://github.com/deeeed/universe/compare/gitguard@@siteed/gitguard@0.3.1...gitguard@@siteed/gitguard@0.3.2
[0.3.1]: https://github.com/deeeed/universe/compare/gitguard@@siteed/gitguard@0.3.0...gitguard@@siteed/gitguard@0.3.1
[0.3.0]: https://github.com/deeeed/universe/compare/gitguard@@siteed/gitguard@0.2.0...gitguard@@siteed/gitguard@0.3.0
