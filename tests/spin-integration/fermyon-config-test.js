
#!/usr/bin/env node

/**
 * Comprehensive Spin/Fermyon Configuration Tests
 * Tests that validate spin.toml configuration and deployment compatibility
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SpinConfigTester {
    constructor() {
        this.rootDir = path.resolve(__dirname, '../..');
        this.spinTomlPath = path.join(this.rootDir, 'spin.toml');
        this.gatewaySpinTomlPath = path.join(this.rootDir, 'gateway/spin.toml');
        this.errors = [];
        this.warnings = [];
    }

    log(message) {
        console.log(`[SpinConfigTest] ${message}`);
    }

    error(message) {
        this.errors.push(message);
        console.error(`[ERROR] ${message}`);
    }

    warn(message) {
        this.warnings.push(message);
        console.warn(`[WARN] ${message}`);
    }

    // Test 1: Validate spin.toml syntax
    testSpinTomlSyntax() {
        this.log('Testing spin.toml syntax validation...');
        
        try {
            execSync('spin build --dry-run', { 
                cwd: this.rootDir,
                stdio: 'pipe' 
            });
            this.log('✅ spin.toml syntax is valid');
        } catch (error) {
            this.error(`spin.toml syntax error: ${error.message}`);
        }
    }

    // Test 2: Validate required variables
    testRequiredVariables() {
        this.log('Testing required variables configuration...');
        
        const requiredVars = [
            'database_url',
            'neon_database_url', 
            'logto_domain',
            'logto_client_id',
            'logto_client_secret'
        ];

        const spinToml = fs.readFileSync(this.spinTomlPath, 'utf8');
        
        for (const variable of requiredVars) {
            if (!spinToml.includes(variable)) {
                this.error(`Required variable '${variable}' not found in spin.toml`);
            } else {
                this.log(`✅ Required variable '${variable}' found`);
            }
        }
    }

    // Test 3: Validate component configuration
    testComponentConfiguration() {
        this.log('Testing component configuration...');
        
        const spinToml = fs.readFileSync(this.spinTomlPath, 'utf8');
        
        // Check gateway-bff component exists
        if (!spinToml.includes('[component.gateway-bff]')) {
            this.error('gateway-bff component not found in spin.toml');
            return;
        }
        
        // Check required component fields
        const requiredFields = [
            'source = "gateway/bff/target/wasm32-wasi/release/bff.wasm"',
            'allowed_outbound_hosts',
            '[component.gateway-bff.build]',
            '[component.gateway-bff.variables]'
        ];
        
        for (const field of requiredFields) {
            if (!spinToml.includes(field.split('=')[0].trim())) {
                this.error(`Component field '${field}' not found`);
            } else {
                this.log(`✅ Component field '${field.split('=')[0].trim()}' found`);
            }
        }
    }

    // Test 4: Validate outbound hosts configuration
    testOutboundHosts() {
        this.log('Testing outbound hosts configuration...');
        
        const spinToml = fs.readFileSync(this.spinTomlPath, 'utf8');
        
        const requiredHosts = [
            'https://*.neon.tech',
            'https://1y6uln.logto.app'
        ];
        
        for (const host of requiredHosts) {
            if (!spinToml.includes(host)) {
                this.error(`Required outbound host '${host}' not found`);
            } else {
                this.log(`✅ Outbound host '${host}' configured`);
            }
        }
    }

    // Test 5: Validate build commands
    testBuildCommands() {
        this.log('Testing build commands...');
        
        const spinToml = fs.readFileSync(this.spinTomlPath, 'utf8');
        
        if (!spinToml.includes('cargo build --target wasm32-wasi --release')) {
            this.error('WASM build command not found in component configuration');
        } else {
            this.log('✅ WASM build command configured correctly');
        }
    }

    // Test 6: Test WASM target compilation
    testWasmCompilation() {
        this.log('Testing WASM target compilation...');
        
        try {
            // Check if wasm32-wasi target is available
            const targets = execSync('rustup target list --installed', { 
                cwd: this.rootDir,
                encoding: 'utf8'
            });
            
            if (!targets.includes('wasm32-wasi')) {
                this.error('wasm32-wasi target not installed');
                return;
            }
            
            this.log('✅ wasm32-wasi target is available');
            
            // Test compilation
            execSync('cd gateway/bff && cargo check --target wasm32-wasi', { 
                cwd: this.rootDir,
                stdio: 'pipe'
            });
            
            this.log('✅ WASM compilation check passed');
            
        } catch (error) {
            this.error(`WASM compilation test failed: ${error.message}`);
        }
    }

    // Test 7: Test key-value store configuration
    testKeyValueStores() {
        this.log('Testing key-value store configuration...');
        
        const spinToml = fs.readFileSync(this.spinTomlPath, 'utf8');
        
        if (!spinToml.includes('[component.gateway-bff.key_value_stores]')) {
            this.warn('Key-value store configuration not found');
        } else {
            this.log('✅ Key-value store configuration found');
        }
    }

    // Test 8: Test route configuration
    testRouteConfiguration() {
        this.log('Testing route configuration...');
        
        const spinToml = fs.readFileSync(this.spinTomlPath, 'utf8');
        
        if (!spinToml.includes('route = "/api/..."')) {
            this.error('API route configuration not found');
        } else {
            this.log('✅ API route configuration found');
        }
        
        if (!spinToml.includes('component = "gateway-bff"')) {
            this.error('Component routing not configured');
        } else {
            this.log('✅ Component routing configured');
        }
    }

    // Test 9: Test environment variable mapping
    testEnvironmentVariableMapping() {
        this.log('Testing environment variable mapping...');
        
        const spinToml = fs.readFileSync(this.spinTomlPath, 'utf8');
        
        const expectedMappings = [
            'database_url = "{{ database_url }}"',
            'logto_domain = "{{ logto_domain }}"',
            'logto_client_id = "{{ logto_client_id }}"',
            'logto_client_secret = "{{ logto_client_secret }}"'
        ];
        
        for (const mapping of expectedMappings) {
            if (!spinToml.includes(mapping)) {
                this.error(`Variable mapping '${mapping}' not found`);
            } else {
                this.log(`✅ Variable mapping '${mapping.split('=')[0].trim()}' found`);
            }
        }
    }

    // Test 10: Test Fermyon Cloud compatibility
    testFermyonCloudCompatibility() {
        this.log('Testing Fermyon Cloud compatibility...');
        
        try {
            // Test spin login command exists
            execSync('spin --version', { stdio: 'pipe' });
            this.log('✅ Spin CLI is available');
            
            // Test that configuration doesn't have incompatible features
            const spinToml = fs.readFileSync(this.spinTomlPath, 'utf8');
            
            if (spinToml.includes('spin_manifest_version = 2')) {
                this.log('✅ Using compatible Spin manifest version 2');
            } else {
                this.warn('Spin manifest version not specified or incompatible');
            }
            
        } catch (error) {
            this.error(`Fermyon Cloud compatibility test failed: ${error.message}`);
        }
    }

    // Run all tests
    async runAllTests() {
        this.log('Starting comprehensive Spin/Fermyon configuration tests...');
        
        this.testSpinTomlSyntax();
        this.testRequiredVariables();
        this.testComponentConfiguration();
        this.testOutboundHosts();
        this.testBuildCommands();
        this.testWasmCompilation();
        this.testKeyValueStores();
        this.testRouteConfiguration();
        this.testEnvironmentVariableMapping();
        this.testFermyonCloudCompatibility();
        
        // Report results
        this.log('\n=== Test Results ===');
        
        if (this.errors.length > 0) {
            console.error(`\n❌ ${this.errors.length} errors found:`);
            this.errors.forEach((error, i) => {
                console.error(`  ${i + 1}. ${error}`);
            });
        }
        
        if (this.warnings.length > 0) {
            console.warn(`\n⚠️  ${this.warnings.length} warnings:`);
            this.warnings.forEach((warning, i) => {
                console.warn(`  ${i + 1}. ${warning}`);
            });
        }
        
        if (this.errors.length === 0) {
            console.log('\n✅ All Spin/Fermyon configuration tests passed!');
            return true;
        } else {
            console.error('\n❌ Some configuration tests failed. Please fix the errors above.');
            return false;
        }
    }
}

// Run tests if called directly
if (require.main === module) {
    const tester = new SpinConfigTester();
    tester.runAllTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = SpinConfigTester;
