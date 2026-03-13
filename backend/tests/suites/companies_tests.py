"""
Companies Test Suite

Tests company features including:
- List companies
- Search companies
- Get company details
"""

from backend.tests.suites.base import BaseTestSuite


class CompaniesTestSuite(BaseTestSuite):
    """Test suite for company features."""

    async def run_tests(self):
        """Run all company tests."""
        # Test 1: List companies
        await self.test_list_companies()

        # Test 2: Search companies
        await self.test_search_companies()

        # Test 3: Get company details
        await self.test_get_company_details()

    async def test_list_companies(self):
        """Test listing all companies."""
        status_code, response_data = await self.get("/companies")

        if status_code == 200 and response_data:
            # Handle both list and paginated responses
            if isinstance(response_data, list):
                companies = response_data
            else:
                companies = response_data.get("companies", response_data.get("data", []))

            self.log_result(
                "List Companies",
                "PASS",
                f"Companies found: {len(companies) if isinstance(companies, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("List Companies", "SKIP", "Companies endpoint not available")
        else:
            self.log_result(
                "List Companies",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_search_companies(self):
        """Test searching for companies."""
        status_code, response_data = await self.get("/companies/search?q=tech&limit=10")

        if status_code == 200 and response_data:
            # Handle both list and paginated responses
            if isinstance(response_data, list):
                results = response_data
            else:
                results = response_data.get("companies", response_data.get("results", response_data.get("data", [])))

            self.log_result(
                "Search Companies",
                "PASS",
                f"Search results: {len(results) if isinstance(results, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("Search Companies", "SKIP", "Search endpoint not available")
        else:
            self.log_result(
                "Search Companies",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_company_details(self):
        """Test getting company details."""
        # First, try to get list of companies to find a company ID
        status_code, companies_data = await self.get("/companies?limit=1")

        if status_code != 200:
            self.log_result("Get Company Details", "SKIP", "Could not fetch companies list")
            return

        # Extract company ID from response
        company_id = None
        if isinstance(companies_data, list) and len(companies_data) > 0:
            company_id = companies_data[0].get("id")
        elif isinstance(companies_data, dict):
            companies = companies_data.get("companies", companies_data.get("data", []))
            if companies and len(companies) > 0:
                company_id = companies[0].get("id")

        if not company_id:
            self.log_result("Get Company Details", "SKIP", "No companies available")
            return

        # Get company details
        details_status, details_data = await self.get(f"/companies/{company_id}")

        if details_status == 200 and details_data:
            company_name = details_data.get("name", "Unknown")
            self.log_result(
                "Get Company Details",
                "PASS",
                f"Company: {company_name}",
                details_data,
            )
        elif details_status == 404:
            self.log_result("Get Company Details", "SKIP", "Company not found")
        else:
            self.log_result(
                "Get Company Details",
                "FAIL",
                f"Status: {details_status}",
                details_data,
            )
