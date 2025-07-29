#!/bin/bash

# Backend Services Test Runner
# Dynamically discovers and runs tests for all services with coverage

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Function to print colored output
print_header() {
    echo -e "${PURPLE}========================================${NC}"
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}========================================${NC}"
}

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_service() {
    echo -e "${BLUE}[SERVICE]${NC} $1"
}

# Function to check if a directory is a Rust service
discover_services() {
    local services=()
    
    # Find all directories containing Cargo.toml
    for dir in */; do
        if [[ -f "$dir/Cargo.toml" ]]; then
            # Extract service name from directory name
            service_name=$(basename "$dir")
            services+=("$service_name")
        fi
    done
    
    echo "${services[@]}"
}

# Function to check if a service has tests
has_tests() {
    local service_dir="$1"
    
    # Check for test files or test directories
    if [[ -d "$service_dir/tests" ]] || 
       [[ -n $(find "$service_dir" -name "*.rs" -exec grep -l "\#\[cfg(test)\]" {} \; 2>/dev/null) ]]; then
        return 0
    else
        return 1
    fi
}

# Function to run tests for a single service
run_service_tests() {
    local service="$1"
    local service_dir="$service"
    
    print_service "Testing $service..."
    
    if [[ ! -d "$service_dir" ]]; then
        print_warning "Service directory $service_dir not found, skipping..."
        return 0
    fi
    
    cd "$service_dir"
    
    # Check if service has tests
    if ! has_tests "."; then
        print_warning "No tests found for $service, skipping..."
        cd ..
        return 0
    fi
    
    # Clean previous build
    cargo clean 2>/dev/null || true
    
    # Run tests
    if cargo test -- --nocapture; then
        print_success "$service tests passed"
        TEST_RESULTS["$service"]="PASSED"
    else
        print_error "$service tests failed"
        TEST_RESULTS["$service"]="FAILED"
        FAILED_SERVICES+=("$service")
    fi
    
    cd ..
}

# Function to run coverage for all services
run_coverage() {
    print_header "RUNNING COVERAGE ANALYSIS"
    
    # Check if cargo-tarpaulin is available
    if ! command -v cargo-tarpaulin &> /dev/null; then
        print_status "Installing cargo-tarpaulin for coverage..."
        cargo install cargo-tarpaulin
    fi
    
    # Create coverage directory
    mkdir -p coverage
    
    # Run workspace-wide coverage
    print_status "Running workspace-wide coverage analysis..."
    if cargo tarpaulin --workspace --out Html --output-dir coverage/workspace --timeout 300 --exclude-files "*/target/*" --exclude-files "*/tests/*"; then
        print_success "Workspace coverage completed"
    else
        print_error "Workspace coverage failed"
    fi
    
    # Run individual service coverage
    for service in "${SERVICES[@]}"; do
        if [[ -d "$service" ]] && has_tests "$service"; then
            print_status "Running coverage for $service..."
            mkdir -p "coverage/$service"
            
            cd "$service"
            if cargo tarpaulin --out Html --output-dir "../coverage/$service" --timeout 120 2>/dev/null; then
                print_success "$service coverage completed"
            else
                print_warning "$service coverage failed or not available"
            fi
            cd ..
        fi
    done
    
    print_success "Coverage reports available in coverage/ directory"
}

# Function to run clippy for all services
run_clippy() {
    print_header "RUNNING CLIPPY ANALYSIS"
    
    if cargo clippy --workspace -- -D warnings; then
        print_success "Workspace clippy checks passed"
    else
        print_warning "Some clippy warnings found (check output above)"
    fi
    
    # Run clippy for individual services
    for service in "${SERVICES[@]}"; do
        if [[ -d "$service" ]]; then
            print_status "Running clippy for $service..."
            cd "$service"
            if cargo clippy -- -D warnings 2>/dev/null; then
                print_success "$service clippy passed"
            else
                print_warning "$service clippy found issues"
            fi
            cd ..
        fi
    done
}

# Function to run formatting checks
run_formatting() {
    print_header "CHECKING CODE FORMATTING"
    
    if cargo fmt --all -- --check; then
        print_success "All code is properly formatted"
    else
        print_warning "Code formatting issues found. Run 'cargo fmt --all' to fix."
    fi
}

# Function to build all services
run_build() {
    print_header "BUILDING ALL SERVICES"
    
    # Build workspace
    if cargo build --workspace; then
        print_success "Workspace build completed"
    else
        print_error "Workspace build failed"
        return 1
    fi
    
    # Build WASM targets
    print_status "Building WASM targets..."
    for service in "${SERVICES[@]}"; do
        if [[ -d "$service" ]] && [[ -f "$service/Cargo.toml" ]]; then
            # Check if it's a WASM service (has cdylib in Cargo.toml)
            if grep -q "cdylib" "$service/Cargo.toml" 2>/dev/null; then
                print_status "Building WASM for $service..."
                cd "$service"
                if cargo build --target wasm32-wasi --release 2>/dev/null; then
                    print_success "$service WASM build completed"
                else
                    print_warning "$service WASM build failed or not configured"
                fi
                cd ..
            fi
        fi
    done
}

# Function to run security audit
run_security_audit() {
    print_header "RUNNING SECURITY AUDIT"
    
    if command -v cargo-audit &> /dev/null; then
        if cargo audit; then
            print_success "Security audit passed"
        else
            print_warning "Security audit found issues (check output above)"
        fi
    else
        print_status "Installing cargo-audit..."
        cargo install cargo-audit
        cargo audit
    fi
}

# Function to generate test summary
generate_summary() {
    print_header "TEST SUMMARY"
    
    echo "Services Tested: ${#SERVICES[@]}"
    echo "Services with Tests: $((${#SERVICES[@]} - ${#SKIPPED_SERVICES[@]}))"
    echo "Services Skipped: ${#SKIPPED_SERVICES[@]}"
    echo "Services Failed: ${#FAILED_SERVICES[@]}"
    echo
    
    if [[ ${#FAILED_SERVICES[@]} -eq 0 ]]; then
        print_success "All tests completed successfully!"
    else
        print_error "Some services failed tests:"
        for service in "${FAILED_SERVICES[@]}"; do
            echo "  - $service"
        done
    fi
    
    echo
    echo "Reports and Artifacts:"
    echo "- Coverage reports: coverage/"
    echo "- Build artifacts: target/"
    echo "- Test binaries: target/debug/deps/"
    echo
    echo "Next Steps:"
    echo "- View coverage: open coverage/index.html"
    echo "- Fix formatting: cargo fmt --all"
    echo "- Fix clippy: cargo clippy --fix --allow-dirty --allow-staged"
}

# Main execution
main() {
    print_header "BACKEND SERVICES TEST RUNNER"
    
    # Check if we're in the backend directory
    if [[ ! -f "Cargo.toml" ]] || ! grep -q "\[workspace\]" Cargo.toml; then
        print_error "Please run this script from the backend directory"
        exit 1
    fi
    
    # Discover services
    print_status "Discovering services..."
    SERVICES=($(discover_services))
    
    if [[ ${#SERVICES[@]} -eq 0 ]]; then
        print_error "No services found!"
        exit 1
    fi
    
    print_success "Found ${#SERVICES[@]} services: ${SERVICES[*]}"
    
    # Initialize arrays
    declare -A TEST_RESULTS
    FAILED_SERVICES=()
    SKIPPED_SERVICES=()
    
    # Parse command line arguments
    RUN_TESTS=true
    RUN_COVERAGE=false
    RUN_CLIPPY=false
    RUN_FORMAT=false
    RUN_BUILD=false
    RUN_AUDIT=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --coverage)
                RUN_COVERAGE=true
                shift
                ;;
            --clippy)
                RUN_CLIPPY=true
                shift
                ;;
            --format)
                RUN_FORMAT=true
                shift
                ;;
            --build)
                RUN_BUILD=true
                shift
                ;;
            --audit)
                RUN_AUDIT=true
                shift
                ;;
            --all)
                RUN_COVERAGE=true
                RUN_CLIPPY=true
                RUN_FORMAT=true
                RUN_BUILD=true
                RUN_AUDIT=true
                shift
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --coverage  Run coverage analysis"
                echo "  --clippy    Run clippy checks"
                echo "  --format    Check code formatting"
                echo "  --build     Build all services"
                echo "  --audit     Run security audit"
                echo "  --all       Run all checks"
                echo "  --help      Show this help"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Run tests for each service
    if [[ "$RUN_TESTS" == true ]]; then
        print_header "RUNNING SERVICE TESTS"
        
        for service in "${SERVICES[@]}"; do
            run_service_tests "$service"
        done
    fi
    
    # Run additional checks
    [[ "$RUN_FORMAT" == true ]] && run_formatting
    [[ "$RUN_CLIPPY" == true ]] && run_clippy
    [[ "$RUN_BUILD" == true ]] && run_build
    [[ "$RUN_AUDIT" == true ]] && run_security_audit
    [[ "$RUN_COVERAGE" == true ]] && run_coverage
    
    # Generate summary
    generate_summary
    
    # Exit with appropriate code
    if [[ ${#FAILED_SERVICES[@]} -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function with all arguments
main "$@"