from playwright.sync_api import sync_playwright
import sys

def test_analysis_detail():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Navigate to analysis list page
        print("Navigating to /analysis...")
        page.goto('http://localhost:3000/analysis')
        page.wait_for_load_state('networkidle')
        
        # Take screenshot of list page
        page.screenshot(path='/tmp/analysis_list.png')
        print("Screenshot of list page saved to /tmp/analysis_list.png")
        
        # Find all analysis links
        links = page.locator('a[href^="/analysis/"]').all()
        if not links:
            print("No analysis links found on page!")
            browser.close()
            return

        print(f"Found {len(links)} analysis links.")
        
        # Click the first analysis link (skip the back button if any)
        # Usually analysis links are like /analysis/1
        target_link = None
        for link in links:
            href = link.get_attribute('href')
            if href and href.split('/')[-1].isdigit():
                target_link = link
                break
        
        if not target_link:
            print("No numeric analysis links found!")
            browser.close()
            return

        href = target_link.get_attribute('href')
        print(f"Clicking on {href}...")
        target_link.click()
        page.wait_for_load_state('networkidle')
        
        # Wait a bit for potential hydration/async fetch
        page.wait_for_timeout(2000)
        
        # Take screenshot of detail page
        page.screenshot(path='/tmp/analysis_detail.png')
        print("Screenshot of detail page saved to /tmp/analysis_detail.png")
        
        # Check for error message
        error_msg = page.locator('text="抱歉，我们无法获取该文章内容"').is_visible()
        if error_msg:
            print("Confirmed: Error message IS visible on detail page.")
        else:
            print("Error message NOT found. Checking page content...")
            title = page.locator('h1').inner_text()
            print(f"Page title: {title}")

        browser.close()

if __name__ == "__main__":
    test_analysis_detail()
