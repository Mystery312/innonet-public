#!/usr/bin/env python3
"""
Feature Parity Test Runner - Main Entry Point

Runs comprehensive feature parity tests across local and production environments
and generates comparison reports.

Usage:
    python feature_parity_test.py                    # Test both environments
    python feature_parity_test.py --env local        # Test local only
    python feature_parity_test.py --env production   # Test production only
    python feature_parity_test.py --html             # Generate HTML report
"""

import asyncio
import sys
import logging
from argparse import ArgumentParser
from pathlib import Path

# Add backend to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from backend.tests.config import EnvironmentType
from backend.tests.test_runner import run_parity_tests


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def parse_arguments():
    """Parse command-line arguments."""
    parser = ArgumentParser(
        description="Run feature parity tests across environments"
    )
    parser.add_argument(
        "--env",
        choices=["local", "production", "both"],
        default="both",
        help="Environment to test (default: both)",
    )
    parser.add_argument(
        "--suite",
        action="append",
        help="Specific test suite to run (can be specified multiple times)",
    )
    parser.add_argument(
        "--html",
        action="store_true",
        help="Generate HTML report",
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Verbose output",
    )
    parser.add_argument(
        "--output-dir",
        default="test_results",
        help="Output directory for reports (default: test_results)",
    )

    return parser.parse_args()


async def main():
    """Main entry point."""
    args = parse_arguments()

    # Determine environments to test
    env_map = {
        "local": [EnvironmentType.LOCAL],
        "production": [EnvironmentType.PRODUCTION],
        "both": [EnvironmentType.LOCAL, EnvironmentType.PRODUCTION],
    }
    environments = env_map.get(args.env, [EnvironmentType.LOCAL, EnvironmentType.PRODUCTION])

    logger.info(f"Starting feature parity tests for: {', '.join(e.value for e in environments)}")

    try:
        await run_parity_tests(
            environments=environments,
            test_suites=args.suite,
            verbose=args.verbose,
        )
        logger.info("Feature parity tests completed successfully")
        return 0
    except Exception as e:
        logger.error(f"Test execution failed: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
