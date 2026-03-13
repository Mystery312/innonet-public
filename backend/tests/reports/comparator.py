"""
Feature Parity Comparator

Analyzes test results from different environments to identify discrepancies
and calculate parity scores.
"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from backend.tests.suites.base import TestResult


@dataclass
class Discrepancy:
    """Represents a discrepancy between environments."""

    test_name: str
    suite_name: str
    issue_type: str  # "status_mismatch", "missing_feature", "performance"
    local_status: Optional[str] = None
    production_status: Optional[str] = None
    details: str = ""
    severity: str = "info"  # info, warning, critical


@dataclass
class ParityAnalysis:
    """Results of parity analysis."""

    total_tests: int = 0
    matching_tests: int = 0
    discrepancies: List[Discrepancy] = field(default_factory=list)
    parity_score: float = 0.0
    critical_issues: List[Discrepancy] = field(default_factory=list)

    def __str__(self) -> str:
        """Format analysis as string."""
        return (
            f"Parity Score: {self.parity_score:.1f}% | "
            f"Matching: {self.matching_tests}/{self.total_tests} | "
            f"Issues: {len(self.discrepancies)}"
        )


class FeatureParityComparator:
    """Compares test results across environments."""

    def __init__(self, results: Dict[str, List[TestResult]]):
        """Initialize comparator.

        Args:
            results: Test results from each environment
        """
        self.results = results

    def analyze(self) -> ParityAnalysis:
        """Analyze feature parity.

        Returns:
            ParityAnalysis object with findings
        """
        analysis = ParityAnalysis()

        # Get test lists from each environment
        env_tests = {}
        for env_name, test_results in self.results.items():
            env_tests[env_name] = self._group_by_test_name(test_results)

        # Find all unique tests
        all_test_names = set()
        for tests in env_tests.values():
            all_test_names.update(tests.keys())

        analysis.total_tests = len(all_test_names)

        # Compare each test
        for test_name in sorted(all_test_names):
            analysis = self._compare_test(test_name, env_tests, analysis)

        # Calculate parity score
        if analysis.total_tests > 0:
            analysis.parity_score = (
                100.0 * analysis.matching_tests / analysis.total_tests
            )

        # Categorize critical issues
        analysis.critical_issues = [
            d for d in analysis.discrepancies if d.severity == "critical"
        ]

        return analysis

    def _group_by_test_name(self, results: List[TestResult]) -> Dict[str, TestResult]:
        """Group results by test name.

        Args:
            results: List of test results

        Returns:
            Dictionary mapping test names to results
        """
        grouped = {}
        for result in results:
            grouped[result.test_name] = result
        return grouped

    def _compare_test(
        self,
        test_name: str,
        env_tests: Dict[str, Dict[str, TestResult]],
        analysis: ParityAnalysis,
    ) -> ParityAnalysis:
        """Compare a single test across environments.

        Args:
            test_name: Name of test to compare
            env_tests: Test results grouped by environment
            analysis: Current analysis (will be updated)

        Returns:
            Updated ParityAnalysis
        """
        statuses = {}
        for env_name, tests in env_tests.items():
            if test_name in tests:
                statuses[env_name] = tests[test_name].status
            else:
                statuses[env_name] = "MISSING"

        # Check if all statuses match
        unique_statuses = set(statuses.values())

        if len(unique_statuses) == 1:
            # All environments have same status
            analysis.matching_tests += 1

            if list(unique_statuses)[0] != "PASS":
                # Same failure across environments
                status = list(unique_statuses)[0]
                if status == "MISSING":
                    discrepancy = Discrepancy(
                        test_name=test_name,
                        suite_name="Unknown",
                        issue_type="missing_feature",
                        details="Test missing in all environments",
                        severity="info",
                    )
                else:
                    discrepancy = Discrepancy(
                        test_name=test_name,
                        suite_name="Unknown",
                        issue_type="status_mismatch",
                        local_status=status,
                        production_status=status,
                        details="Same failure in all environments",
                        severity="warning",
                    )
                analysis.discrepancies.append(discrepancy)
        else:
            # Statuses differ between environments
            local = statuses.get("Local Development", "MISSING")
            prod = statuses.get("Hong Kong Production", "MISSING")

            discrepancy = Discrepancy(
                test_name=test_name,
                suite_name="Unknown",
                issue_type="status_mismatch",
                local_status=local,
                production_status=prod,
                details=f"Local: {local}, Production: {prod}",
                severity="critical" if (local != prod and "PASS" in (local, prod)) else "warning",
            )
            analysis.discrepancies.append(discrepancy)

        return analysis

    def get_summary(self) -> Dict[str, Any]:
        """Get summary of comparison.

        Returns:
            Summary dictionary
        """
        analysis = self.analyze()

        return {
            "parity_score": analysis.parity_score,
            "total_tests": analysis.total_tests,
            "matching_tests": analysis.matching_tests,
            "discrepancies": len(analysis.discrepancies),
            "critical_issues": len(analysis.critical_issues),
        }
