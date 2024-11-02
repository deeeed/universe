graph TD
    A[Start PR Analysis] --> B{Analyze Content}
    
    %% Initial Analysis Branches
    B --> C1[Size Analysis]
    B --> C2[Complexity Analysis]
    B --> C3[Dependency Analysis]
    B --> C4[Context Analysis]
    
    %% Size Analysis Path
    C1 --> D1{Too Large?}
    D1 -->|Yes| E1[AI: Generate Split Suggestions]
    E1 --> F1[Create Split Plan]
    F1 --> G1[Generate Scripts]
    
    %% Complexity Analysis Path
    C2 --> D2{Too Complex?}
    D2 -->|Yes| E2[AI: Suggest Refactoring]
    E2 --> F2[Generate Tasks]
    
    %% Dependency Analysis Path
    C3 --> D3{Found Dependencies?}
    D3 -->|Yes| E3[Generate Dependency Graph]
    E3 --> F3[Suggest Merge Order]
    
    %% Context Analysis & Integration
    C4 --> D4[Fetch External Context]
    D4 --> E4[GitHub Issues]
    D4 --> E5[Jira Tickets]
    D4 --> E6[Related PRs]
    
    %% AI Enhancement Layer
    E4 & E5 & E6 --> F4[AI: Analyze Context]
    F4 --> G4[Generate Smart Description]
    F4 --> G5[Link Related Items]
    F4 --> G6[Suggest Labels/Reviewers]
    
    %% Final Actions
    G1 & G4 & G5 & G6 --> H[Present Results]
    H --> I[Interactive Actions Menu]
    
    %% Action Menu Options
    I --> J1[Apply Split Plan]
    I --> J2[Update PR Description]
    I --> J3[Create Subtasks]
    I --> J4[Link Issues]
