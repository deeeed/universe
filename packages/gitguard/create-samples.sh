#!/bin/bash

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Find git root directory
GIT_ROOT=$(git rev-parse --show-toplevel)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Create sample directories
mkdir -p "$GIT_ROOT/packages/ui/src"
mkdir -p "$GIT_ROOT/packages/ui/tests"
mkdir -p "$GIT_ROOT/packages/core/src"
mkdir -p "$GIT_ROOT/docs"

# Create sample files
cat > "$GIT_ROOT/packages/ui/package.json" << 'EOF'
{
    "name": "@project/ui",
    "version": "1.0.0"
}
EOF

# Note the use of 'EOFBUTTON' to avoid confusion with backticks
cat > "$GIT_ROOT/packages/ui/src/Button.tsx" << 'EOFBUTTON'
import styled from 'styled-components';

export const Button = styled.button`
    background: blue;
    color: white;
`;
EOFBUTTON

cat > "$GIT_ROOT/packages/ui/tests/Button.test.tsx" << 'EOF'
import { render } from '@testing-library/react';
import { Button } from '../src/Button';

describe('Button', () => {
    it('renders correctly', () => {
        const { container } = render(<Button>Test</Button>);
        expect(container).toMatchSnapshot();
    });
});
EOF

cat > "$GIT_ROOT/packages/core/package.json" << 'EOF'
{
    "name": "@project/core",
    "version": "1.0.0"
}
EOF

cat > "$GIT_ROOT/packages/core/src/utils.ts" << 'EOF'
export function formatDate(date: Date): string {
    return date.toISOString();
}
EOF

cat > "$GIT_ROOT/docs/README.md" << 'EOF'
# Project Documentation
This is a sample documentation file.
EOF

echo -e "${GREEN}✅ Sample files created successfully!${NC}"
echo -e "${YELLOW}Try creating commits with changes in different files to test GitGuard:${NC}"
echo "- UI component changes (packages/ui/src/Button.tsx)"
echo "- Test file changes (packages/ui/tests/Button.test.tsx)"
echo "- Core utility changes (packages/core/src/utils.ts)"
echo "- Documentation changes (docs/README.md)"
