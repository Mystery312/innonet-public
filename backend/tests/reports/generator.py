"""
Report Generator

Generates human-readable and machine-readable reports from test results.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime

from backend.tests.suites.base import TestResult
from backend.tests.reports.comparator import FeatureParityComparator, ParityAnalysis


class ReportGenerator:
    """Generates test reports in various formats."""

    def __init__(
        self,
        results: Dict[str, List[TestResult]],
        output_dir: Path,
    ):
        """Initialize report generator.

        Args:
            results: Test results from each environment
            output_dir: Directory for output files
        """
        self.results = results
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)

    def generate_json_report(self) -> Path:
        """Generate JSON report.

        Returns:
            Path to generated report
        """
        report_path = self.output_dir / "parity_report.json"

        data = {
            "timestamp": datetime.now().isoformat(),
            "environments": [],
        }

        for env_name, results in self.results.items():
            env_data = {
                "name": env_name,
                "total_tests": len(results),
                "passed": sum(1 for r in results if r.status == "PASS"),
                "failed": sum(1 for r in results if r.status == "FAIL"),
                "skipped": sum(1 for r in results if r.status == "SKIP"),
                "tests": [r.to_dict() for r in results],
            }
            data["environments"].append(env_data)

        # Add comparison
        comparator = FeatureParityComparator(self.results)
        summary = comparator.get_summary()
        data["parity_analysis"] = summary

        with open(report_path, "w") as f:
            json.dump(data, f, indent=2)

        return report_path

    def generate_html_report(self) -> Path:
        """Generate HTML report (Phase 3).

        Returns:
            Path to generated report
        """
        report_path = self.output_dir / "parity_report.html"

        # For Phase 1, generate a simple HTML report
        html_content = self._generate_html_content()

        with open(report_path, "w") as f:
            f.write(html_content)

        return report_path

    def _generate_html_content(self) -> str:
        """Generate HTML content for report.

        Returns:
            HTML string
        """
        # Simple HTML for Phase 1
        comparator = FeatureParityComparator(self.results)
        analysis = comparator.analyze()

        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>Feature Parity Test Report</title>
    <style>
        body {{
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
            background-color: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        h1, h2 {{
            color: #333;
        }}
        .summary {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin: 20px 0;
        }}
        .summary-card {{
            background: #f9f9f9;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }}
        .summary-card.critical {{
            border-left-color: #dc3545;
        }}
        .summary-value {{
            font-size: 24px;
            font-weight: bold;
            color: #007bff;
        }}
        .summary-card.critical .summary-value {{
            color: #dc3545;
        }}
        .summary-label {{
            font-size: 12px;
            color: #666;
            text-transform: uppercase;
        }}
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        th {{
            background-color: #f9f9f9;
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
        }}
        td {{
            border: 1px solid #ddd;
            padding: 10px;
        }}
        tr:nth-child(even) {{
            background-color: #f9f9f9;
        }}
        .pass {{ color: #28a745; }}
        .fail {{ color: #dc3545; }}
        .skip {{ color: #ffc107; }}
        .timestamp {{
            color: #999;
            font-size: 12px;
            margin-top: 20px;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>Feature Parity Test Report</h1>

        <div class="summary">
            <div class="summary-card">
                <div class="summary-label">Parity Score</div>
                <div class="summary-value">{analysis.parity_score:.1f}%</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Total Tests</div>
                <div class="summary-value">{analysis.total_tests}</div>
            </div>
            <div class="summary-card">
                <div class="summary-label">Matching</div>
                <div class="summary-value">{analysis.matching_tests}</div>
            </div>
            <div class="summary-card critical">
                <div class="summary-label">Issues</div>
                <div class="summary-value">{len(analysis.discrepancies)}</div>
            </div>
        </div>

        <h2>Environment Results</h2>
        <table>
            <tr>
                <th>Environment</th>
                <th>Total Tests</th>
                <th>Passed</th>
                <th>Failed</th>
                <th>Skipped</th>
            </tr>
"""
        for env_name, results in self.results.items():
            passed = sum(1 for r in results if r.status == "PASS")
            failed = sum(1 for r in results if r.status == "FAIL")
            skipped = sum(1 for r in results if r.status == "SKIP")

            html += f"""            <tr>
                <td>{env_name}</td>
                <td>{len(results)}</td>
                <td class="pass">{passed}</td>
                <td class="fail">{failed}</td>
                <td class="skip">{skipped}</td>
            </tr>
"""

        html += """        </table>

        <h2>Discrepancies</h2>
"""
        if analysis.discrepancies:
            html += """        <table>
            <tr>
                <th>Test</th>
                <th>Issue Type</th>
                <th>Local</th>
                <th>Production</th>
                <th>Details</th>
            </tr>
"""
            for disc in analysis.discrepancies:
                html += f"""            <tr>
                <td>{disc.test_name}</td>
                <td>{disc.issue_type}</td>
                <td>{disc.local_status or '-'}</td>
                <td>{disc.production_status or '-'}</td>
                <td>{disc.details}</td>
            </tr>
"""
            html += """        </table>
"""
        else:
            html += """        <p>No discrepancies found. Perfect parity!</p>
"""

        html += f"""
        <div class="timestamp">
            Generated: {datetime.now().isoformat()}
        </div>
    </div>
</body>
</html>
"""
        return html

    def print_console_report(self):
        """Print report to console."""
        print("\n" + "=" * 80)
        print("PARITY ANALYSIS")
        print("=" * 80)

        comparator = FeatureParityComparator(self.results)
        analysis = comparator.analyze()

        print(f"\nParity Score: {analysis.parity_score:.1f}%")
        print(f"Total Tests: {analysis.total_tests}")
        print(f"Matching: {analysis.matching_tests}")
        print(f"Discrepancies: {len(analysis.discrepancies)}")

        if analysis.critical_issues:
            print(f"\n⚠️  Critical Issues ({len(analysis.critical_issues)}):")
            for disc in analysis.critical_issues:
                print(
                    f"  {disc.test_name}: {disc.local_status} (local) vs "
                    f"{disc.production_status} (production)"
                )

        print("\n" + "=" * 80)
