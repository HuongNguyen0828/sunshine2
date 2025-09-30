# Git Workflow Guide: Merging Pull Requests

This guide covers different approaches to merging pull requests, with a focus on local merging while maintaining IDE conflict resolution capabilities.

---

## Table of Contents
1. [Quick Reference](#quick-reference)
2. [Option 1: Traditional Git Merge](#option-1-traditional-git-merge)
3. [Option 2: GitHub CLI Auto-Merge](#option-2-github-cli-auto-merge)
4. [Option 3: Hybrid Approach (Recommended)](#option-3-hybrid-approach-recommended)
5. [Handling Merge Conflicts](#handling-merge-conflicts)
6. [Common Scenarios](#common-scenarios)
7. [Best Practices](#best-practices)

---

## Quick Reference

```bash
# Recommended: Hybrid approach with IDE conflict resolution
git checkout master
git pull origin master
git merge feature/branch-name
# (Resolve conflicts in IDE if needed)
git push origin master
gh pr close <PR-number> --delete-branch
git branch -d feature/branch-name

# Quick: GitHub CLI auto-merge (no conflict resolution)
gh pr merge <PR-number> --merge --delete-branch

# Manual: Traditional git (full control)
git checkout master
git merge feature/branch-name
git push origin master
```

---

## Option 1: Traditional Git Merge

**Use when:** You want full manual control without GitHub CLI.

### Steps

```bash
# 1. Switch to master branch
git checkout master

# 2. Update master with latest changes
git pull origin master

# 3. Merge the feature branch
git merge feature/branch-name

# 4. If conflicts occur, resolve them in your IDE
# (Your IDE will show conflict markers)
# After resolving:
git add <resolved-files>
git commit

# 5. Push to remote (auto-closes PR if it exists)
git push origin master

# 6. Clean up feature branch
git branch -d feature/branch-name           # Delete local
git push origin --delete feature/branch-name  # Delete remote
```

### Pros
- ✅ Full control over every step
- ✅ IDE conflict resolution
- ✅ Can test locally before pushing
- ✅ No additional tools needed

### Cons
- ❌ Manual branch cleanup
- ❌ More commands to remember
- ❌ PR status might not update automatically

---

## Option 2: GitHub CLI Auto-Merge

**Use when:** No conflicts expected and you want quick, automated merging.

### Steps

```bash
# One command does everything
gh pr merge <PR-number> --merge --delete-branch

# Variations:
gh pr merge <PR-number> --squash --delete-branch  # Squash all commits
gh pr merge <PR-number> --rebase --delete-branch  # Rebase commits
gh pr merge <PR-number> --merge                   # Keep branch
```

### Pros
- ✅ Single command
- ✅ Automatic branch cleanup
- ✅ PR status updated automatically
- ✅ Clean commit history options (squash/rebase)

### Cons
- ❌ Cannot resolve conflicts interactively
- ❌ Less control over merge process
- ❌ Cannot test locally before merge
- ❌ Harder to undo if something goes wrong

---

## Option 3: Hybrid Approach (Recommended)

**Use when:** You want GitHub CLI convenience with IDE conflict resolution capability.

### Steps

```bash
# 1. Switch to master and update
git checkout master
git pull origin master

# 2. Merge locally (IDE will catch conflicts)
git merge feature/branch-name

# 3. If conflicts occur:
#    - Your IDE will show conflict markers
#    - Resolve conflicts in your IDE
#    - Stage resolved files:
git add <resolved-files>
#    - Commit the merge:
git commit

# 4. Test locally (optional but recommended)
npm run build    # or whatever your test command is
npm run test

# 5. Push to master (auto-closes and marks PR as merged)
git push origin master

# 6. Use GitHub CLI for cleanup
gh pr close <PR-number> --delete-branch  # Closes PR, deletes remote branch
git branch -d feature/branch-name         # Delete local branch
```

### Pros
- ✅ Full IDE conflict resolution
- ✅ Can test locally before pushing
- ✅ PR automatically marked as merged (not just closed)
- ✅ GitHub CLI handles cleanup
- ✅ See exactly what's being merged
- ✅ Safe and reversible

### Cons
- ❌ Requires both git and GitHub CLI
- ❌ More steps than pure GitHub CLI

---

## Handling Merge Conflicts

### What are Merge Conflicts?

Conflicts occur when:
- Both branches modified the same lines
- One branch deleted a file that another modified
- Multiple people edited the same section

### Identifying Conflicts

```bash
git merge feature/branch-name

# If conflicts occur, you'll see:
Auto-merging file.txt
CONFLICT (content): Merge conflict in file.txt
Automatic merge failed; fix conflicts and then commit the result.
```

### Resolving in IDE

**Most IDEs (VS Code, IntelliJ, etc.) will show:**

```
<<<<<<< HEAD (master)
Current code on master branch
=======
Incoming code from feature branch
>>>>>>> feature/branch-name
```

**Steps:**
1. Open conflicted file in your IDE
2. IDE will highlight conflict sections
3. Choose which code to keep:
   - "Accept Current Change" (keep master)
   - "Accept Incoming Change" (keep feature)
   - "Accept Both Changes" (keep both)
   - Manual edit (custom resolution)
4. Save file
5. Stage and commit:

```bash
git add <resolved-file>
git commit  # Will have pre-filled merge commit message
```

### Aborting a Merge

If you want to cancel the merge:

```bash
git merge --abort  # Returns to pre-merge state
```

---

## Common Scenarios

### Scenario 1: Clean Merge (No Conflicts)

```bash
git checkout master
git pull origin master
git merge feature/navbar-redesign
# Output: Fast-forward or clean merge
git push origin master
gh pr close 10 --delete-branch
git branch -d feature/navbar-redesign
```

**Time:** ~30 seconds

---

### Scenario 2: Merge with Conflicts

```bash
git checkout master
git pull origin master
git merge feature/teachers-tab

# Output: CONFLICT in file.tsx
# 1. Open file in IDE
# 2. Resolve conflicts using IDE tools
# 3. Save file

git add web-admin/components/file.tsx
git commit  # Save merge commit
git push origin master
gh pr close 9 --delete-branch
git branch -d feature/teachers-tab
```

**Time:** 2-10 minutes (depending on conflict complexity)

---

### Scenario 3: Test Before Merging

```bash
git checkout master
git pull origin master
git merge feature/new-feature

# Test the merge locally
npm run build
npm run test
npm run lint

# If tests fail:
git merge --abort
# Fix issues in feature branch first

# If tests pass:
git push origin master
gh pr close 11 --delete-branch
git branch -d feature/new-feature
```

**Time:** 5-15 minutes

---

### Scenario 4: Squash Multiple Commits

**Using GitHub CLI:**
```bash
gh pr merge 10 --squash --delete-branch
```

**Using Git:**
```bash
git checkout master
git pull origin master
git merge --squash feature/branch-name
git commit -m "feat: description of all changes"
git push origin master
gh pr close 10 --delete-branch
git branch -d feature/branch-name
```

**Result:** All commits from feature branch become one commit on master.

---

### Scenario 5: Keep Feature Branch After Merge

```bash
git checkout master
git pull origin master
git merge feature/experimental
git push origin master
# Don't delete branches - keep for future work
```

**Use when:** Feature branch will be used for more work later.

---

## Best Practices

### Before Merging

1. **Update master first**
   ```bash
   git checkout master
   git pull origin master
   ```
   Ensures you're merging into the latest code.

2. **Review PR changes**
   ```bash
   gh pr view <PR-number>
   gh pr diff <PR-number>
   ```

3. **Check for conflicts early**
   ```bash
   git merge feature/branch-name --no-commit --no-ff
   # Review changes
   git merge --abort  # If you're just checking
   ```

### During Merging

1. **Resolve conflicts carefully**
   - Read both versions
   - Understand why conflict exists
   - Test after resolution

2. **Keep merge commits clean**
   - Don't add unrelated changes
   - Keep original merge message or make it descriptive

3. **Test before pushing**
   ```bash
   npm run build && npm run test
   ```

### After Merging

1. **Delete merged branches**
   ```bash
   git branch -d feature/branch-name           # Local
   git push origin --delete feature/branch-name  # Remote
   # Or use: gh pr close <PR> --delete-branch
   ```

2. **Update other developers**
   - Notify team in Slack/Discord
   - Update project board
   - Comment on related issues

3. **Verify PR status**
   ```bash
   gh pr view <PR-number>  # Should show "MERGED"
   ```

---

## Troubleshooting

### Problem: "Already up to date" but PR not closed

**Solution:**
```bash
# Manually close PR
gh pr close <PR-number>
```

### Problem: Pushed wrong merge, need to undo

**Solution:**
```bash
# Reset master to previous commit
git reset --hard HEAD~1

# Force push (dangerous!)
git push origin master --force

# Better: Revert the merge commit
git revert -m 1 <merge-commit-hash>
git push origin master
```

### Problem: Deleted branch but want it back

**Solution:**
```bash
# Find the commit hash
git reflog

# Recreate branch
git checkout -b feature/branch-name <commit-hash>
```

### Problem: Conflicts too complex, want fresh start

**Solution:**
```bash
# Abort current merge
git merge --abort

# Pull latest from both branches
git checkout master
git pull origin master
git checkout feature/branch
git pull origin feature/branch

# Try merge again
git checkout master
git merge feature/branch
```

---

## Comparison Table

| Method | IDE Conflicts | Local Test | Auto Cleanup | Speed | Control |
|--------|--------------|------------|--------------|-------|---------|
| Traditional Git | ✅ Yes | ✅ Yes | ❌ No | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| GH CLI Auto | ❌ No | ❌ No | ✅ Yes | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Hybrid (Recommended) | ✅ Yes | ✅ Yes | ✅ Yes* | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

*Requires `gh pr close --delete-branch` command

---

## Examples from Our Project

### Example 1: Merging Navbar Redesign (PR #10)

```bash
# Clean merge expected, using hybrid approach
git checkout master
git pull origin master
git merge feature/navbar-redesign

# No conflicts! Test locally:
cd web-admin
npm run build

# Looks good, push:
git push origin master

# Cleanup:
gh pr close 10 --delete-branch
git branch -d feature/navbar-redesign

# Verify:
gh pr view 10  # Status: MERGED ✓
```

### Example 2: Merging Teachers Tab (PR #9) with Conflicts

```bash
git checkout master
git pull origin master
git merge feature/teachers-tab-redesign

# Conflict in dashboard/page.tsx!
# Open in VS Code, resolve conflicts
# VS Code shows: Accept Incoming | Accept Current | Accept Both

git add web-admin/app/dashboard/page.tsx
git commit  # Saves merge commit

# Test:
cd web-admin
npm run dev  # Check in browser

# Push:
git push origin master

# Cleanup:
gh pr close 9 --delete-branch
git branch -d feature/teachers-tab-redesign
```

---

## Quick Tips

1. **Always pull master first** - `git pull origin master`
2. **Use IDE for conflicts** - Don't edit conflict markers manually
3. **Test before pushing** - Run build/tests locally
4. **Keep branches short-lived** - Merge frequently to avoid conflicts
5. **Write good commit messages** - Future you will thank you
6. **Delete merged branches** - Keep repo clean
7. **Use `--no-ff` for feature branches** - Preserves branch history
   ```bash
   git merge --no-ff feature/branch-name
   ```

---

## Related Documentation

- [Git Branching Strategy](./git-branching-strategy.md) (if exists)
- [Code Review Guidelines](./code-review-guidelines.md) (if exists)
- [Release Process](./release-process.md) (if exists)

---

**Last Updated:** 2025-09-30
**Maintained By:** Development Team