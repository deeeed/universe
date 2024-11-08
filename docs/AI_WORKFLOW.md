# AI Workflow

Below are the main workflow prompts used for generating development specifications, PR descriptions, and PR summaries.

-- Generate commit prompt
-- Follow up prompt: "generate one commit command to copy/paste consolidating the different suggestions into one commit message"

## Create Development Specification

Please help me define the specifications for "{feature name}" considering the following aspects:

1. Technical Requirements
   - Core functionality requirements
   - Data models and interfaces needed
   - API endpoints or services required
   - State management considerations
   - Performance requirements

2. Implementation Guidelines
   - Component architecture
   - Data flow and state management approach
   - Error handling strategy
   - Testing requirements
   - Security considerations

3. UI/UX Considerations
   - User interaction flows
   - Accessibility requirements
   - Mobile responsiveness needs
   - Animation requirements

4. Dependencies and Integration
   - Required third-party libraries
   - Integration points with existing systems
   - Breaking changes and migration needs

Please provide the specification in a structured format that:
- Is easily interpretable by AI models
- Minimizes breaking changes
- Uses object parameters for extensibility
- Includes clear acceptance criteria
- Defines testing scenarios

## Generate Commit Suggestions

@Commit Please analyze the changes and generate a conventionalcommit message that includes:

1. Summary
   - High-level overview of changes
   - Purpose and motivation
   - Technical approach taken

## Generate PR Description

@PR Please analyze the changes and generate a PR description that includes:

1. Summary
   - High-level overview of changes
   - Purpose and motivation
   - Technical approach taken

2. Implementation Details
   - Key architectural decisions
   - Notable code changes
   - Performance considerations
   - Security implications

3. Testing Strategy
   - Test coverage
   - Manual testing scenarios
   - Edge cases considered

4. Breaking Changes
   - API changes
   - Migration steps
   - Backward compatibility notes

## Generate PR Summary

@PR Please provide a concise summary of changes including:

1. Core Changes
   - Features added/modified
   - Bugs fixed
   - Performance improvements
   - Breaking changes

2. Technical Impact
   - Architecture modifications
   - Dependencies updated
   - API changes
   - Database changes

3. Testing Coverage
   - Unit tests added/modified
   - Integration tests
   - E2E test coverage

Format as bullet points without markdown formatting.
