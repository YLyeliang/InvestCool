from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Capture console logs
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        page.on("pageerror", lambda exc: print(f"PAGE ERROR: {exc}"))

        try:
            print("Navigating to http://localhost:5173...")
            page.goto('http://localhost:5173')
            time.sleep(5) # Wait for potential async load
            page.wait_for_load_state('networkidle')
            
            print("Page title:", page.title())
            print("Body text length:", len(page.inner_text("body")))
            
            # Take a screenshot to see the visual state
            page.screenshot(path='/tmp/investcool_debug.png')
            print("Screenshot saved to /tmp/investcool_debug.png")
            
            # Check for specific elements
            root_content = page.inner_html("#root")
            print("Root HTML content length:", len(root_content))
            if len(root_content) < 100:
                print("Root content is suspiciously short:", root_content)
                
        except Exception as e:
            print(f"Error during testing: {e}")
        finally:
            browser.close()

if __name__ == "__main__":
    run()
