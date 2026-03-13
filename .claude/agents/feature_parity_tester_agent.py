#!/usr/bin/env python3
"""
Feature Parity Testing Agent Implementation

This agent autonomously runs feature parity tests across Innonet environments
and generates comprehensive reports for environment verification.

Usage:
  python feature_parity_tester_agent.py --env local
  python feature_parity_tester_agent.py --env production
  python feature_parity_tester_agent.py --analyze-report
"""

import asyncio
import sys
import json
from pathlib import Path
from datetime import datetime
from argparse import ArgumentParser
from typing import Optional, Dict, List

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from backend.tests.config import EnvironmentType, get_all_configs
from backend.tests.test_runner import run_parity_tests
from backend.tests.reports.comparator import FeatureParityComparator
from backend.tests.reports.generator import ReportGenerator


class FeatureParityAgentReporter:
    """Enhanced reporting for the Feature Parity Testing Agent."""

    def __init__(self, results_dir: Path = Path("test_results")):
        """Initialize reporter."""
        self.results_dir = Path(results_dir)
        self.results_dir.mkdir(exist_ok=True)

    def print_parity_summary(self, results: Dict) -> None:
        """Print a human-friendly parity summary."""
        print("\n" + "=" * 80)
        print("📊 FEATURE PARITY ANALYSIS")
        print("=" * 80)

        for env_name, test_results in results.items():
            passed = sum(1 for r in test_results if r.status == "PASS")
            failed = sum(1 for r in test_results if r.status == "FAIL")
            skipped = sum(1 for r in test_results if r.status == "SKIP")
            total = len(test_results)

            pass_rate = (passed / total * 100) if total > 0 else 0

            print(f"\n🔍 {env_name}")
            print(f"   Total Tests: {total}")
            print(f"   ✅ Passed: {passed} ({pass_rate:.1f}%)")
            print(f"   ❌ Failed: {failed}")
            print(f"   ⊘ Skipped: {skipped}")

        # Generate comparison
        comparator = FeatureParityComparator(results)
        analysis = comparator.analyze()

        print(f"\n📈 PARITY SCORE: {analysis.parity_score:.1f}%")
        print(f"   Matching Tests: {analysis.matching_tests}/{analysis.total_tests}")
        print(f"   Discrepancies: {len(analysis.discrepancies)}")

        if analysis.critical_issues:
            print(f"\n⚠️  CRITICAL ISSUES ({len(analysis.critical_issues)}):")
            for issue in analysis.critical_issues[:5]:  # Show top 5
                print(f"   - {issue.test_name}: {issue.details}")

        print("\n" + "=" * 80)

    def analyze_latest_report(self) -> None:
        """Analyze the latest test report."""
        json_report = self.results_dir / "parity_report.json"

        if not json_report.exists():
            print("❌ No test report found. Run tests first with: /agents feature-parity-tester")
            return

        with open(json_report, "r") as f:
            data = json.load(f)

        print("\n" + "=" * 80)
        print("📋 LATEST TEST REPORT ANALYSIS")
        print("=" * 80)

        if "parity_analysis" in data:
            analysis = data["parity_analysis"]
            print(f"\n🎯 Parity Score: {analysis.get('parity_score', 0):.1f}%")
            print(f"   Total Tests: {analysis.get('total_tests', 0)}")
            print(f"   Matching: {analysis.get('matching_tests', 0)}")
            print(f"   Issues: {analysis.get('discrepancies', 0)}")
            print(f"   Critical: {analysis.get('critical_issues', 0)}")

        # Show environment details
        if "environments" in data:
            print("\n📍 ENVIRONMENT RESULTS:")
            for env in data["environments"]:
                name = env.get("name", "Unknown")
                total = env.get("total_tests", 0)
                passed = env.get("passed", 0)
                failed = env.get("failed", 0)
                skipped = env.get("skipped", 0)

                print(f"\n   {name}:")
                print(f"      ✅ Passed: {passed}/{total}")
                print(f"      ❌ Failed: {failed}/{total}")
                print(f"      ⊘ Skipped: {skipped}/{total}")

        print(f"\n📄 Full Report: {json_report}")
        print(f"   HTML Report: {self.results_dir / 'parity_report.html'}")
        print("\n" + "=" * 80)

    def print_recommendations(self, results: Dict) -> None:
        """Print recommendations based on test results."""
        comparator = FeatureParityComparator(results)
        analysis = comparator.analyze()

        if analysis.parity_score >= 95:
            print("\n✅ EXCELLENT: Environments are well-synchronized!")
        elif analysis.parity_score >= 80:
            print("\n⚠️  GOOD: Some minor discrepancies detected")
        elif analysis.parity_score >= 50:
            print("\n❌ FAIR: Significant discrepancies detected")
        else:
            print("\n🚨 POOR: Major issues require attention")

        if analysis.critical_issues:
            print(f"\n💡 RECOMMENDATIONS:")
            print(f"   1. Investigate {len(analysis.critical_issues)} critical issues")
            for issue in analysis.critical_issues[:3]:
                print(f"      - {issue.test_name}: {issue.details}")

            print(f"\n   2. Check endpoint availability on production")
            print(f"   3. Verify authentication configuration")
            print(f"   4. Review recent deployments for breaking changes")


async def main():
    """Main agent entry point."""
    parser = ArgumentParser(description="Feature Parity Testing Agent")
    parser.add_argument(
        "--env",
        choices=["local", "production", "both"],
        default="both",
        help="Environment to test",
    )
    parser.add_argument(
        "--suite",
        action="append",
        help="Specific test suite to run",
    )
    parser.add_argument(
        "--html",
        action="store_true",
        help="Generate HTML report",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Verbose output",
    )
    parser.add_argument(
        "--analyze-report",
        action="store_true",
        help="Analyze latest test report",
    )
    parser.add_argument(
        "--output-dir",
        default="test_results",
        help="Output directory for reports",
    )

    args = parser.parse_args()
    reporter = FeatureParityAgentReporter(args.output_dir)

    # Analyze report if requested
    if args.analyze_report:
        reporter.analyze_latest_report()
        return 0

    # Determine environments to test
    env_map = {
        "local": [EnvironmentType.LOCAL],
        "production": [EnvironmentType.PRODUCTION],
        "both": [EnvironmentType.LOCAL, EnvironmentType.PRODUCTION],
    }
    environments = env_map.get(args.env, [EnvironmentType.LOCAL, EnvironmentType.PRODUCTION])

    print("\n" + "=" * 80)
    print("🚀 FEATURE PARITY TESTING AGENT")
    print("=" * 80)
    print(f"Environments: {', '.join(e.value for e in environments)}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("=" * 80 + "\n")

    # Run tests
    try:
        results = await run_parity_tests(
            environments=environments,
            test_suites=args.suite,
            verbose=args.verbose,
        )

        # Print enhanced summary
        reporter.print_parity_summary(results)

        # Print recommendations
        reporter.print_recommendations(results)

        # Generate reports
        generator = ReportGenerator(results, Path(args.output_dir))
        if args.html:
            generator.print_console_report()

        print(f"\n📁 Reports saved to: {Path(args.output_dir).absolute()}")
        print("✅ Agent execution completed successfully\n")

        return 0

    except Exception as e:
        print(f"\n❌ Agent Error: {e}\n")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
