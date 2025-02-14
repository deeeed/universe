# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]


## [0.7.1] - 2025-02-14
### Changed
- test
## [0.7.0] - 2025-02-14

## [0.6.0] - 2024-11-19
- improve token management and complexity analysis (#37) ([43229bd](https://github.com/deeeed/universe/commit/43229bd45361d629d81585179885deba1d891ade))
- refactor(ai): standardize token limits and security checks (#38) ([1ff1afc](https://github.com/deeeed/universe/commit/1ff1afc968cabbfb9a1c691f0d15acbdc4275b76))
## [0.5.0] - 2024-11-18
- refactor(prompt): migrate from readline to @inquirer/prompts for interactive CLI (#32) ([55ace61](https://github.com/deeeed/universe/commit/55ace61e83bb021e2d3067acbaadd79d4e0c88bd))
- feat(gitguard): enhance template system and add API convenience features (#31) ([f6fe45b](https://github.com/deeeed/universe/commit/f6fe45b1a6a38c9722a158df84a8a7d530167a8d))
- feat(gitguard): implement type-safe template system with comprehensive management features (#30) ([b1470e7](https://github.com/deeeed/universe/commit/b1470e75466717bcf55b522c2575eff901d1e42e))
- docs(gitguard): restructure documentation and improve contributor guides (#35) ([73521f5](https://github.com/deeeed/universe/commit/73521f56de0a560efe0fdddedc97dbcc7e3dc2e1))
- feat(ai): integrate multiple AI providers and enhance commit management (#34) ([a33b4ec](https://github.com/deeeed/universe/commit/a33b4ec570bef297f36e686d69a7a05b11f84e39))
- refactor(gitguard): migrate prompt handling to service-based architecture with enhanced UI (#33) ([62f43b9](https://github.com/deeeed/universe/commit/62f43b9af6505b17888dcc467f0a80b3fc0cbb93))
- refactor(gitguard): enhance security scanning with minimatch and improve commit validation (#29) ([aa66055](https://github.com/deeeed/universe/commit/aa6605543c90541248862a62f16be19746b4010f))
- refactor(core): enhance configuration system and AI provider initialization (#28) ([84e04f6](https://github.com/deeeed/universe/commit/84e04f63e43798ad344901efe5a97a93569c57fb))
## [0.4.3] - 2024-11-11
- refactor(cli): improve package version detection reliability ([f48dca5](https://github.com/deeeed/universe/commit/f48dca593b86f2f949de26931995cd7b7d89fad6))
## [0.4.2] - 2024-11-11
- add option to disable colors in CLI (#26) ([a6be573](https://github.com/deeeed/universe/commit/a6be573c495c611876e1026e0a85f902a9c40a3f))
- refactor(gitguard): improve package version handling (#27) ([3c8f703](https://github.com/deeeed/universe/commit/3c8f703ce62a16e320a0346ac934c112a119f560))
## [0.4.1] - 2024-11-11
- refactor(gitguard): migrate to project-based test setup and enhance configuration system (#25) ([98d12a0](https://github.com/deeeed/universe/commit/98d12a0ce58ab35aa923c58f2e377abc41bde2be))
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

[unreleased]: https://github.com/deeeed/universe/compare/gitguard@0.7.1...HEAD
[0.7.1]: https://github.com/deeeed/universe/compare/gitguard@0.7.0...gitguard@0.7.1
[0.7.0]: https://github.com/deeeed/universe/compare/gitguard@0.6.0...gitguard@0.7.0
[0.6.0]: https://github.com/deeeed/universe/compare/gitguard@0.5.1...gitguard@0.6.0
[0.5.0]: https://github.com/deeeed/universe/compare/gitguard@0.4.3...gitguard@0.5.0
[0.4.3]: https://github.com/deeeed/universe/compare/@siteed/gitguard@0.4.2...@siteed/gitguard@0.4.3
[0.4.2]: https://github.com/deeeed/universe/compare/@siteed/gitguard@0.4.1...@siteed/gitguard@0.4.2
[0.4.1]: https://github.com/deeeed/universe/compare/@siteed/gitguard@0.4.0...@siteed/gitguard@0.4.1
[0.4.0]: https://github.com/deeeed/universe/compare/@siteed/gitguard@0.3.2...@siteed/gitguard@0.4.0
[0.3.2]: https://github.com/deeeed/universe/compare/gitguard@@siteed/gitguard@0.3.1...gitguard@@siteed/gitguard@0.3.2
[0.3.1]: https://github.com/deeeed/universe/compare/gitguard@@siteed/gitguard@0.3.0...gitguard@@siteed/gitguard@0.3.1
[0.3.0]: https://github.com/deeeed/universe/compare/gitguard@@siteed/gitguard@0.2.0...gitguard@@siteed/gitguard@0.3.0
