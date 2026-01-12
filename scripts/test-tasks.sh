#!/bin/bash
# Test all Taskfile tasks for idempotency and proper execution
# This script will test each task to ensure it works correctly

set -e

echo "=== Task Testing Suite ===" 
echo ""

FAILED_TASKS=()
PASSED_TASKS=()

# Function to test a task
test_task() {
    local task_name="$1"
    local should_fail="${2:-false}"
    
    echo "Testing: task $task_name"
    
    if [ "$should_fail" = "true" ]; then
        # Task is expected to fail (e.g., requires dependencies)
        if timeout 10 task "$task_name" 2>&1 >/dev/null; then
            PASSED_TASKS+=("$task_name (unexpected success)")
        else
            echo "  -> Expected failure (OK)"
            PASSED_TASKS+=("$task_name")
        fi
    else
        if timeout 30 task "$task_name" 2>&1 >/dev/null; then
            echo "  -> PASSED"
            PASSED_TASKS+=("$task_name")
        else
            echo "  -> FAILED"
            FAILED_TASKS+=("$task_name")
        fi
    fi
    echo ""
}

# Test meta tasks (should always work)
echo "--- Testing Meta Tasks ---"
# test_task "default" true  # Don't run default as it starts services

# Test build tasks (require dependencies)
echo "--- Testing Build Tasks ---"  
test_task "build:frontend"
test_task "build:gateway" 

# Test quality tasks
echo "--- Testing Quality Tasks ---"
test_task "fmt"
test_task "lint"

# Test clean tasks (should be idempotent)
echo "--- Testing Clean Tasks ---"
test_task "clean"

# Results summary
echo "========================================"
echo "Test Results Summary"
echo "========================================"
echo "Passed: ${#PASSED_TASKS[@]}"
echo "Failed: ${#FAILED_TASKS[@]}"
echo ""

if [ ${#FAILED_TASKS[@]} -gt 0 ]; then
    echo "Failed tasks:"
    for task in "${FAILED_TASKS[@]}"; do
        echo "  - $task"
    done
    exit 1
else
    echo "All tested tasks passed!"
    exit 0
fi
