# Personal Dev Notes

Quick setup:
```bash
git clone git@github.com:deeeed/universe.git
cd universe
yarn install
cd packages/gitguard
yarn build
yarn link
```

Test in another project:
```bash
cd /other/project
yarn link "@siteed/gitguard"
```

Dev cycle:
1. Make changes in src/
2. yarn build:clean
3. yarn gitguard hook install --global
4. git commit -m "test"

Debug:
```bash
GITGUARD_DEBUG=true git commit -m "test"
node --inspect-brk ./dist/cjs/cli/gitguard.cjs hook install
```

Fix hook issues:
```bash
ls -la ~/.config/git/hooks/
cat ~/.config/git/hooks/prepare-commit-msg
rm ~/.config/git/hooks/prepare-commit-msg
yarn gitguard hook install --global
```

Build issues:
```bash
rm -rf dist/
yarn cache clean
yarn build:clean
```

Link issues:
```bash
yarn unlink "@siteed/gitguard"
cd packages/gitguard
yarn link
cd /other/project
yarn link "@siteed/gitguard"
```

Watch mode:
```bash
yarn watch
yarn test --watch
```

Key files:
- src/cli/gitguard.ts (main CLI)
- src/hooks/prepare-commit.ts (git hook)
- src/commands/hook.ts (install/uninstall)

Test locally:
```bash
yarn build:clean && yarn gitguard hook install --global
GITGUARD_DEBUG=true git commit -m "test"
```

Remember:
- Always rebuild after changes
- Check hook installation if not working
- Use debug mode to see what's happening
- Clean dist/ if weird build issues
