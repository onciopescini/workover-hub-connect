
from playwright.sync_api import sync_playwright, expect

def test_admin_dashboard():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        # Create a context with viewport large enough to see desktop layout
        context = browser.new_context(viewport={'width': 1280, 'height': 800})
        page = context.new_page()

        try:
            print("Navigating to Admin Dashboard...")
            page.goto("http://localhost:3000/admin")

            # Wait for content to load
            print("Waiting for dashboard header...")
            # Expect "Admin Control Center" header to be visible
            expect(page.get_by_role("heading", name="Admin Control Center")).to_be_visible(timeout=20000)

            print("Verifying sidebar...")
            # Verify Sidebar links exist
            expect(page.get_by_role("link", name="Dashboard")).to_be_visible()
            expect(page.get_by_role("link", name="Users")).to_be_visible()
            expect(page.get_by_role("link", name="Bookings")).to_be_visible()
            expect(page.get_by_role("link", name="Platform Revenue")).to_be_visible()

            print("Verifying KPI cards...")
            # Verify KPI Cards exist (by searching for their titles)
            expect(page.get_by_text("Total Users")).to_be_visible()
            expect(page.get_by_text("Gross Volume")).to_be_visible()
            expect(page.get_by_text("Estimated Revenue")).to_be_visible()

            print("Taking screenshot...")
            page.screenshot(path="verification/admin_dashboard.png")
            print("Screenshot saved to verification/admin_dashboard.png")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path="verification/admin_dashboard_error.png")
            raise e
        finally:
            browser.close()

if __name__ == "__main__":
    test_admin_dashboard()
