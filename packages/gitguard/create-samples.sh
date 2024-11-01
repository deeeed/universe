#!/bin/bash

# Exit on any error
set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Find git root directory
GIT_ROOT=$(git rev-parse --show-toplevel)
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Not in a git repository${NC}"
    exit 1
fi

# Ensure we're in the gitguard directory
if [[ ! "$SCRIPT_DIR" =~ .*/packages/gitguard$ ]]; then
    echo -e "${RED}❌ Error: Script must be run from packages/gitguard directory${NC}"
    echo "Current directory: $SCRIPT_DIR"
    exit 1
fi

# Create sample directories relative to script location
mkdir -p "$SCRIPT_DIR/packages/ui/src"
mkdir -p "$SCRIPT_DIR/packages/ui/tests"
mkdir -p "$SCRIPT_DIR/packages/core/src"
mkdir -p "$SCRIPT_DIR/docs"

# Create sample files
cat > "$SCRIPT_DIR/packages/ui/package.json" << 'EOF'
{
    "name": "@project/ui",
    "version": "1.0.0"
}
EOF

cat > "$SCRIPT_DIR/packages/ui/src/Button.tsx" << 'EOFBUTTON'
import styled from 'styled-components';

export const Button = styled.button`
    background: blue;
    color: white;
`;
EOFBUTTON

cat > "$SCRIPT_DIR/packages/ui/tests/Button.test.tsx" << 'EOF'
import { render } from '@testing-library/react';
import { Button } from '../src/Button';

describe('Button', () => {
    it('renders correctly', () => {
        const { container } = render(<Button>Test</Button>);
        expect(container).toMatchSnapshot();
    });
});
EOF

cat > "$SCRIPT_DIR/packages/core/package.json" << 'EOF'
{
    "name": "@project/core",
    "version": "1.0.0"
}
EOF

cat > "$SCRIPT_DIR/packages/core/src/utils.ts" << 'EOF'
export function formatDate(date: Date): string {
    return date.toISOString();
}
EOF

cat > "$SCRIPT_DIR/docs/README.md" << 'EOF'
# Project Documentation
This is a sample documentation file.
EOF

echo -e "${GREEN}✅ Sample files created successfully in: ${SCRIPT_DIR}${NC}"
echo -e "${YELLOW}Try creating commits with changes in different files to test GitGuard:${NC}"
echo "- UI component changes (packages/ui/src/Button.tsx)"
echo "- Test file changes (packages/ui/tests/Button.test.tsx)"
echo "- Core utility changes (packages/core/src/utils.ts)"
echo "- Documentation changes (docs/README.md)"
