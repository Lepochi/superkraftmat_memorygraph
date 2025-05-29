# 🚀 Claude Code Beast Mode: Quick Start Guide

## 🎯 Transform Claude Code from Assistant to Beast in 4 Phases

### Phase 1: Foundation (Day 1) ✅
You've completed this! The resource system is installed.

### Phase 2: Activation (Day 2-7) 🔄
1. **Enable slash commands**:
   ```bash
   cd ~/superkraft_memory/.claude/scripts
   chmod +x *.sh
   ./update_prompts.sh --init
   ```

2. **Run your first analysis**:
   ```bash
   claude /analyze ~/superkraft_memory
   ```

3. **Start with TDD**:
   ```bash
   claude "Read @.claude/frameworks/tdd_framework.md and implement a simple feature using full TDD"
   ```

### Phase 3: Evolution (Week 2-4) 📈
1. **Weekly complexity tracking**:
   ```bash
   # Add to crontab
   0 9 * * 1 ~/superkraft_memory/.claude/scripts/complexity_tracker.sh ~/superkraft_memory
   ```

2. **Prompt optimization**:
   ```bash
   # After each successful project
   claude "Update @.claude/metrics/success_patterns.json with what worked well"
   ```

3. **Create project specs**:
   ```bash
   claude "Use @.claude/prompts/spec_generator.md to create a spec for [YOUR NEXT PROJECT]"
   ```

### Phase 4: Beast Mode (Month 2+) 🦾
- Claude Code anticipates your needs
- Automated workflow optimization
- Self-improving prompts
- Zero-friction development

## 📋 Daily Workflow

### Morning Startup
```bash
# 1. Load project context (IMPORTANT!)
claude "Read @docs/context/CURRENT_STATE.md and summarize what needs attention today"

# 2. Check complexity growth
./complexity_tracker.sh

# 3. Review AI suggestions
claude "Check @.claude/metrics/complexity_log.json and suggest today's optimizations"

# 4. Load your project plan
claude "Read @prompt_plan.md and summarize current status"
```

### During Development
```bash
# For new features
claude /analyze && claude "Create spec for new feature: [DESCRIPTION]"

# For debugging
claude /debug "Error: [ERROR MESSAGE]"

# For refactoring
claude /refactor "Improve performance of [FUNCTION/MODULE]"

# For testing
claude /test "Create comprehensive tests for [FEATURE]"
```

### End of Day
```bash
# Update success patterns
claude "Update @.claude/metrics/success_patterns.json with today's wins"

# Plan tomorrow
claude "Based on today's progress, what should be the focus tomorrow?"
```

## 🎮 Power User Commands

### Reasoning Mode Activation
```bash
# For complex problems
claude --model o1-pro "Design architecture for [COMPLEX SYSTEM]" > architecture.md
claude "Implement @architecture.md step by step"
```

### Batch Processing
```bash
# Process multiple files
find . -name "*.js" -exec claude "Add JSDoc comments to {}" \;
```

### Continuous Integration
```bash
# Add to .git/hooks/pre-commit
claude "Review staged changes for issues" || exit 1
```

## 📊 Success Metrics to Track

### Week 1 Baseline
- [ ] Commands per day: ___
- [ ] Lines of code per session: ___
- [ ] Time to implement feature: ___
- [ ] Bug fix time: ___

### Week 4 Target
- [ ] Commands per day: -50% (more efficient)
- [ ] Lines of code per session: +200%
- [ ] Time to implement feature: -60%
- [ ] Bug fix time: -80%

## 🧠 Mental Model Shift

### Old Way
1. Think of solution
2. Write code
3. Test manually
4. Fix bugs
5. Maybe add tests

### Beast Mode Way
1. Describe goal to Claude Code
2. Claude generates spec
3. Claude writes tests
4. Claude implements with TDD
5. You review and guide

## 🚨 Common Pitfalls to Avoid

1. **Over-prompting**: Let Claude Code work autonomously
2. **Under-specifying**: Be clear about requirements
3. **Skipping tests**: Always use TDD
4. **Not tracking patterns**: Update metrics regularly
5. **Working against the system**: Trust the process

## 🎯 30-Day Challenge

- **Day 1-7**: Use all slash commands at least once
- **Day 8-14**: Complete one project with full TDD
- **Day 15-21**: Let Claude Code generate and execute a full spec
- **Day 22-30**: Achieve 50% reduction in development time

## 💡 Pro Tips

1. **Context is King**: Keep spec.md and prompt_plan.md updated
2. **Version Everything**: Git commit after each Claude Code session
3. **Learn from Failures**: Update patterns when things don't work
4. **Share Knowledge**: Export successful patterns for team use
5. **Automate Repetition**: If you do it twice, make it a command

## 🔗 Quick Reference

```bash
# Most used commands
claude /analyze          # Analyze codebase
claude /test            # Generate tests
claude /refactor        # Improve code
claude /debug           # Fix issues
claude /document        # Create docs

# Power combos
claude /analyze && claude /test && claude /refactor
claude "Read @spec.md and implement next feature"
claude "Update @prompt_plan.md and continue"
```

## 🎊 You're Ready!

Start with one small feature using the full system. Within 30 days, you'll be operating at a completely different level of productivity.

Remember: The goal isn't to replace thinking, but to amplify your capabilities and eliminate friction.

**Welcome to Beast Mode! 🦾**
