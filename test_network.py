from playwright.sync_api import sync_playwright
import sys

def test_analysis_network():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Log all network requests
        page.on("request", lambda request: print(f">> Request: {request.method} {request.url}"))
        page.on("response", lambda response: print(f"<< Response: {response.status} {response.url}"))

        print("Navigating to /analysis...")
        # Note: Added environment variable to bypass proxy
        page.goto('http://localhost:3000/analysis')
        page.wait_for_load_state('networkidle')
        
        # Find first analysis link
        link = page.locator('a[href^="/analysis/"]').first
        if not link.is_visible():
            print("No analysis links found.")
            browser.close()
            return

        href = link.get_attribute('href')
        print(f"Clicking on {href}...")
        link.click()
        
        # Wait for the network to be idle after click
        try:
            page.wait_for_load_state('networkidle', timeout=5000)
        except:
            print("Timeout waiting for network idle.")

        # Final check
        print(f"Current URL: {page.url}")
        content = page.content()
        if "抱歉，我们无法获取该文章内容" in content:
            print("ERROR DETECTED: Error message found in page content.")
        else:
            print("SUCCESS: Error message NOT found.")

        browser.close()

if __name__ == "__main__":
    test_analysis_network()
