describe("changelog unreleased content", () => {
  it("should extract unreleased content correctly", () => {
    const content = `# Changelog

## [Unreleased]
- feature 1
- feature 2

## [0.4.8] - 2024-10-30
- other stuff`;

    const unreleasedMatch = content.match(
      /## \[Unreleased\]([\s\S]*?)(?=## \[|$)/i,
    );
    const unreleasedContent = unreleasedMatch ? unreleasedMatch[1].trim() : "";

    expect(unreleasedContent).toBe("- feature 1\n- feature 2");
  });

  it("should handle empty unreleased section", () => {
    const content = `# Changelog
  
  ## [Unreleased]
  
  ## [0.4.8] - 2024-10-30
  - other stuff`;

    const unreleasedMatch = content.match(
      /## \[Unreleased\]([\s\S]*?)(?=## \[|$)/i,
    );
    const unreleasedContent = unreleasedMatch ? unreleasedMatch[1].trim() : "";

    expect(unreleasedContent).toBe("");
  });

  it("should handle missing unreleased section", () => {
    const content = `# Changelog
  
  ## [0.4.8] - 2024-10-30
  - other stuff`;

    const unreleasedMatch = content.match(
      /## \[Unreleased\]([\s\S]*?)(?=## \[|$)/i,
    );
    const unreleasedContent = unreleasedMatch ? unreleasedMatch[1].trim() : "";

    expect(unreleasedContent).toBe("");
  });
});
