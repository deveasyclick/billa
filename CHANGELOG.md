# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-06

### Added
- Initial release of Billa SDK
- Support for InterSwitch and VTPass payment providers
- Automatic provider failover mechanism
- Bill payment execution with multiple retries
- Customer validation for various bill types
- Fetching available billing plans
- Support for AIRTIME, DATA, TV, ELECTRICITY, and GAMING categories
- Framework-agnostic stateless architecture
- Full TypeScript support
- Comprehensive documentation and examples

### Features
- `BillaClient`: Main entry point for bill payment operations
- `getPlans()`: Fetch available billing plans from one or both providers
- `pay()`: Execute bill payments with automatic failover
- `validateCustomer()`: Validate customer information before payment
- `setProviderPreference()`: Configure primary and fallback providers
- Automatic token caching for InterSwitch bearer tokens
- In-memory caching support with custom cache implementation option

### Architecture
- No database dependencies - fully stateless
- Pluggable HTTP client (uses axios by default)
- Pluggable cache implementation (defaults to in-memory)
- Error recovery with configurable retry logic
- Clean separation of concerns with provider factory pattern
