"""
Feature Parity Test Runner.

Orchestrates test execution across environments and collects results.
"""

import asyncio
import logging
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Type

from backend.tests.config import EnvironmentConfig, EnvironmentType, get_all_configs, TestConfig
from backend.tests.suites.base import BaseTestSuite, TestResult
from backend.tests.suites.auth_tests import AuthTestSuite
from backend.tests.suites.profile_tests import ProfileTestSuite
from backend.tests.suites.events_tests import EventsTestSuite
from backend.tests.suites.network_tests import NetworkTestSuite
from backend.tests.suites.graph_tests import GraphTestSuite
from backend.tests.suites.communities_tests import CommunitiesTestSuite
from backend.tests.suites.messaging_tests import MessagingTestSuite
from backend.tests.suites.companies_tests import CompaniesTestSuite
from backend.tests.suites.discover_tests import DiscoverTestSuite
from backend.tests.reports.generator import ReportGenerator


logger = logging.getLogger(__name__)


class FeatureParityTestRunner:
    """Orchestrates feature parity testing across environments."""

    def __init__(
        self,
        config: Optional[TestConfig] = None,
        env_configs: Optional[List[EnvironmentConfig]] = None,
    ):
        """Initialize test runner.

        Args:
            config: Test execution configuration
            env_configs: List of environment configurations to test
        """
        self.config = config or TestConfig()
        self.env_configs = env_configs or get_all_configs()
        self.results: Dict[str, List[TestResult]] = {}
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None

        # Create output directory
        self.output_dir = Path(self.config.output_dir)
        self.output_dir.mkdir(exist_ok=True)

    async def run_all_tests(self) -> Dict[str, List[TestResult]]:
        """Run all tests across all environments.

        Returns:
            Dictionary mapping environment names to test results
        """
        self.start_time = datetime.now()
        print("\n" + "=" * 80)
        print("FEATURE PARITY TEST RUNNER")
        print("=" * 80)
        print(f"Environments: {len(self.env_configs)}")
        print(f"Test Suites: {len(self.config.test_suites)}")
        print(f"Timestamp: {self.start_time.isoformat()}")
        print("=" * 80)

        for env_config in self.env_configs:
            print(f"\n>>> Testing: {env_config.name}")
            print("-" * 80)

            env_results = await self.run_environment_tests(env_config)
            self.results[env_config.name] = env_results

            # Print summary for this environment
            passed = sum(1 for r in env_results if r.status == "PASS")
            failed = sum(1 for r in env_results if r.status == "FAIL")
            skipped = sum(1 for r in env_results if r.status == "SKIP")

            print(f"\nEnvironment Summary: {passed} passed, {failed} failed, {skipped} skipped")

        self.end_time = datetime.now()
        return self.results

    async def run_environment_tests(self, env_config: EnvironmentConfig) -> List[TestResult]:
        """Run all tests for a single environment.

        Args:
            env_config: Environment configuration

        Returns:
            List of test results
        """
        all_results = []
        test_suites = self._get_test_suites()

        for suite_class in test_suites:
            try:
                suite = suite_class(env_config)

                # Setup
                if not await suite.setup():
                    print(f"  ✗ {suite_class.__name__}: Setup failed")
                    continue

                # Run tests
                print(f"  >>> {suite_class.__name__}")
                await suite.run_tests()

                # Collect results
                suite_results = suite.get_results()
                all_results.extend(suite_results)

                # Print results
                for result in suite_results:
                    print(f"    {result}")

                # Teardown
                await suite.teardown()

            except Exception as e:
                logger.error(f"Suite {suite_class.__name__} failed: {e}")
                print(f"  ✗ {suite_class.__name__}: {e}")

        return all_results

    def _get_test_suites(self) -> List[Type[BaseTestSuite]]:
        """Get test suite classes to run.

        Returns:
            List of test suite classes
        """
        # All available test suites (in order)
        all_suites = [
            AuthTestSuite,
            ProfileTestSuite,
            EventsTestSuite,
            NetworkTestSuite,
            GraphTestSuite,
            CommunitiesTestSuite,
            MessagingTestSuite,
            CompaniesTestSuite,
            DiscoverTestSuite,
        ]

        # Filter by configured suites if specified
        if self.config.test_suites:
            suite_names = {s.__name__.replace("TestSuite", "").lower() for s in all_suites}
            requested = {s.lower() for s in self.config.test_suites}
            all_suites = [s for s in all_suites if s.__name__.replace("TestSuite", "").lower() in requested]

        return all_suites

    def save_results(self) -> Dict[str, Path]:
        """Save test results to files.

        Returns:
            Dictionary mapping report types to file paths
        """
        saved_files = {}
        generator = ReportGenerator(self.results, self.output_dir)

        # Save JSON report
        if self.config.generate_json_report:
            json_path = generator.generate_json_report()
            saved_files["json"] = json_path

        # Save HTML report
        if self.config.generate_html_report:
            html_path = generator.generate_html_report()
            saved_files["html"] = html_path

        # Print console report
        generator.print_console_report()

        return saved_files

    def print_summary(self):
        """Print summary of test results."""
        print("\n" + "=" * 80)
        print("TEST EXECUTION SUMMARY")
        print("=" * 80)

        total_tests = sum(len(results) for results in self.results.values())
        total_passed = sum(
            sum(1 for r in results if r.status == "PASS") for results in self.results.values()
        )
        total_failed = sum(
            sum(1 for r in results if r.status == "FAIL") for results in self.results.values()
        )
        total_skipped = sum(
            sum(1 for r in results if r.status == "SKIP") for results in self.results.values()
        )

        print(f"Total Tests: {total_tests}")
        print(f"Passed: {total_passed} ({100 * total_passed // max(total_tests, 1)}%)")
        print(f"Failed: {total_failed}")
        print(f"Skipped: {total_skipped}")

        if self.start_time and self.end_time:
            duration = (self.end_time - self.start_time).total_seconds()
            print(f"Duration: {duration:.2f}s")

        print("=" * 80)


async def run_parity_tests(
    environments: Optional[List[EnvironmentType]] = None,
    test_suites: Optional[List[str]] = None,
    verbose: bool = True,
) -> Dict[str, List[TestResult]]:
    """Run feature parity tests.

    Args:
        environments: Environments to test (default: all)
        test_suites: Test suites to run (default: all)
        verbose: Enable verbose output

    Returns:
        Test results
    """
    config = TestConfig(
        environments=environments or [EnvironmentType.LOCAL, EnvironmentType.PRODUCTION],
        test_suites=test_suites or [],
        verbose=verbose,
    )

    env_configs = [
        config for config in get_all_configs()
        if config.type in (environments or [EnvironmentType.LOCAL, EnvironmentType.PRODUCTION])
    ]

    runner = FeatureParityTestRunner(config=config, env_configs=env_configs)
    results = await runner.run_all_tests()

    runner.print_summary()
    runner.save_results()

    return results
