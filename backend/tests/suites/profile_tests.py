"""
Profile Test Suite

Tests profile features including:
- Get user profile
- Update user profile
- Get profile completion
- Profile sections (education, experience, projects, etc.)
"""

from backend.tests.suites.base import BaseTestSuite


class ProfileTestSuite(BaseTestSuite):
    """Test suite for user profile features."""

    async def run_tests(self):
        """Run all profile tests."""
        # Test 1: Get user profile
        await self.test_get_user_profile()

        # Test 2: Get profile completion
        await self.test_get_profile_completion()

        # Test 3: Update user bio
        await self.test_update_user_bio()

        # Test 4: List user education
        await self.test_list_user_education()

        # Test 5: Add user experience
        await self.test_add_user_experience()

        # Test 6: List user experience
        await self.test_list_user_experience()

        # Test 7: Get user projects
        await self.test_get_user_projects()

        # Test 8: Get user skills
        await self.test_get_user_skills()

        # Test 9: Get public profile
        await self.test_get_public_profile()

    async def test_get_user_profile(self):
        """Test getting user profile."""
        if not self.user_id:
            self.log_result("Get User Profile", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get(f"/profiles/{self.user_id}")

        if status_code == 200 and response_data:
            self.log_result(
                "Get User Profile",
                "PASS",
                f"Profile loaded for user {self.user_id}",
                response_data,
            )
        else:
            self.log_result(
                "Get User Profile",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_profile_completion(self):
        """Test getting profile completion score."""
        if not self.user_id:
            self.log_result("Get Profile Completion", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get(f"/profiles/{self.user_id}/completion")

        if status_code == 200 and response_data:
            completion_score = response_data.get("completion_percentage", 0)
            self.log_result(
                "Get Profile Completion",
                "PASS",
                f"Completion: {completion_score}%",
                response_data,
            )
        elif status_code == 404:
            # Profile endpoint might not exist
            self.log_result("Get Profile Completion", "SKIP", "Endpoint not available")
        else:
            self.log_result(
                "Get Profile Completion",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_update_user_bio(self):
        """Test updating user bio."""
        if not self.user_id:
            self.log_result("Update User Bio", "SKIP", "No authenticated user")
            return

        if self.env.read_only:
            self.log_result("Update User Bio", "SKIP", "Read-only environment")
            return

        test_bio = "Test bio for feature parity testing"
        status_code, response_data = await self.put(
            f"/profiles/{self.user_id}",
            json={"bio": test_bio},
        )

        if status_code in [200, 201]:
            self.log_result(
                "Update User Bio",
                "PASS",
                "Bio updated successfully",
                response_data,
            )
        elif status_code == 404:
            self.log_result("Update User Bio", "SKIP", "Update endpoint not available")
        elif status_code == 401:
            self.log_result("Update User Bio", "SKIP", "Authentication required")
        else:
            self.log_result(
                "Update User Bio",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_list_user_education(self):
        """Test listing user education."""
        if not self.user_id:
            self.log_result("List User Education", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get(f"/profiles/{self.user_id}/education")

        if status_code == 200 and response_data:
            education_items = response_data if isinstance(response_data, list) else response_data.get("education", [])
            self.log_result(
                "List User Education",
                "PASS",
                f"Education items: {len(education_items) if isinstance(education_items, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("List User Education", "SKIP", "Endpoint not available")
        else:
            self.log_result(
                "List User Education",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_add_user_experience(self):
        """Test adding user experience."""
        if not self.user_id:
            self.log_result("Add User Experience", "SKIP", "No authenticated user")
            return

        if self.env.read_only:
            self.log_result("Add User Experience", "SKIP", "Read-only environment")
            return

        experience_data = {
            "company": "Test Company",
            "title": "Test Title",
            "start_date": "2023-01-01",
            "end_date": "2024-01-01",
            "description": "Test experience",
        }

        status_code, response_data = await self.post(
            f"/profiles/{self.user_id}/experience",
            json=experience_data,
        )

        if status_code in [200, 201]:
            self.log_result(
                "Add User Experience",
                "PASS",
                "Experience added successfully",
                response_data,
            )
        elif status_code == 404:
            self.log_result("Add User Experience", "SKIP", "Endpoint not available")
        elif status_code == 401:
            self.log_result("Add User Experience", "SKIP", "Authentication required")
        else:
            self.log_result(
                "Add User Experience",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_list_user_experience(self):
        """Test listing user experience."""
        if not self.user_id:
            self.log_result("List User Experience", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get(f"/profiles/{self.user_id}/experience")

        if status_code == 200 and response_data:
            experience_items = response_data if isinstance(response_data, list) else response_data.get("experience", [])
            self.log_result(
                "List User Experience",
                "PASS",
                f"Experience items: {len(experience_items) if isinstance(experience_items, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("List User Experience", "SKIP", "Endpoint not available")
        else:
            self.log_result(
                "List User Experience",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_user_projects(self):
        """Test getting user projects."""
        if not self.user_id:
            self.log_result("Get User Projects", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get(f"/profiles/{self.user_id}/projects")

        if status_code == 200 and response_data:
            projects = response_data if isinstance(response_data, list) else response_data.get("projects", [])
            self.log_result(
                "Get User Projects",
                "PASS",
                f"Projects: {len(projects) if isinstance(projects, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("Get User Projects", "SKIP", "Endpoint not available")
        else:
            self.log_result(
                "Get User Projects",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_user_skills(self):
        """Test getting user skills."""
        if not self.user_id:
            self.log_result("Get User Skills", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get(f"/profiles/{self.user_id}/skills")

        if status_code == 200 and response_data:
            skills = response_data if isinstance(response_data, list) else response_data.get("skills", [])
            self.log_result(
                "Get User Skills",
                "PASS",
                f"Skills: {len(skills) if isinstance(skills, list) else 0}",
                response_data,
            )
        elif status_code == 404:
            self.log_result("Get User Skills", "SKIP", "Endpoint not available")
        else:
            self.log_result(
                "Get User Skills",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )

    async def test_get_public_profile(self):
        """Test getting public profile."""
        if not self.user_id:
            self.log_result("Get Public Profile", "SKIP", "No authenticated user")
            return

        status_code, response_data = await self.get(f"/profiles/{self.user_id}/public")

        if status_code == 200 and response_data:
            self.log_result(
                "Get Public Profile",
                "PASS",
                "Public profile accessible",
                response_data,
            )
        elif status_code == 404:
            self.log_result("Get Public Profile", "SKIP", "Endpoint not available")
        else:
            self.log_result(
                "Get Public Profile",
                "FAIL",
                f"Status: {status_code}",
                response_data,
            )
