
from playwright.sync_api import Page, expect, sync_playwright

def verify_booking_modal(page: Page):
    # 1. Arrange: Go to the test page
    # Port is 8082 based on logs
    page.goto("http://localhost:8082/test-booking-modal")

    # 2. Act: Wait for the modal to be visible
    # The modal opens automatically on mount in the test page

    # 3. Assert: Check for specific elements that confirm our changes

    # Status Badge
    # We look for "Servizio completato" text
    status_badge = page.get_by_text("Servizio completato")
    expect(status_badge).to_be_visible()

    # Check color - standardized Purple for 'served'
    # Class checking is brittle, but we can check if it has 'bg-purple-100' or similar if we knew the exact class output.
    # For now, visibility of the correct label is key.

    # Price
    # We calculated 2.5 hours * 20 EUR = 50.00 EUR
    price_text = page.get_by_text("€ 50.00")
    expect(price_text).to_be_visible()

    # Address
    # "Via Roma 1, Milano"
    address_text = page.get_by_text("Via Roma 1, Milano")
    expect(address_text).to_be_visible()

    # 4. Screenshot
    page.screenshot(path="/home/jules/verification/booking-modal-polished.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_booking_modal(page)
        finally:
            browser.close()
