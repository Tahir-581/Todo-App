"""
WhatsApp Automation Bot (Selenium Version)
------------------------------------------
A reliable WhatsApp automation tool using Selenium.

USAGE GUIDE:
  python whatsapp_bot.py --send "+923001234567" --message "Hello!"
  python whatsapp_bot.py --bulk contacts.csv --message "Team update: meeting at 5pm"
  python whatsapp_bot.py --schedule --to "+923001234567" --message "Standup" --repeat daily --at "09:00"
  python whatsapp_bot.py --log
  python whatsapp_bot.py --list-jobs

Requirements:
  - Google Chrome installed.
  - Scan QR code ONCE on first run.
"""

import os
import json
import csv
import time
import argparse
import datetime
import re
import uuid
import sys
import threading
import random
import urllib.parse
from typing import List, Dict, Optional, Any

# Selenium Imports
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

import schedule
from colorama import init, Fore, Style
from tabulate import tabulate

# Initialize Colorama
init(autoreset=True)

# Paths anchored to this file so CLI and Node spawn work regardless of cwd (matches reference project).
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

# Constants
DATA_DIR = os.path.join(_ROOT, "whatsapp_bot_data")
CONFIG_FILE = os.path.join(DATA_DIR, "messages.json")
LOG_FILE = os.path.join(DATA_DIR, "log.csv")
PROFILE_DIR = os.path.join(DATA_DIR, "selenium_profile")

# Ensure Directories exist
for path in [DATA_DIR, PROFILE_DIR]:
    if not os.path.exists(path):
        os.makedirs(path)

class DataManager:
    @staticmethod
    def load_data() -> Dict[str, Any]:
        if not os.path.exists(CONFIG_FILE):
            default_data = {"templates": {}, "scheduled_jobs": []}
            DataManager.save_data(default_data)
            return default_data
        try:
            with open(CONFIG_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, IOError):
            return {"templates": {}, "scheduled_jobs": []}

    @staticmethod
    def save_data(data: Dict[str, Any]):
        with open(CONFIG_FILE, "w") as f:
            json.dump(data, f, indent=4)

    @staticmethod
    def log_message(recipient: str, message: str, status: str):
        file_exists = os.path.isfile(LOG_FILE)
        with open(LOG_FILE, "a", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(["Timestamp", "Recipient", "Message Preview", "Status"])
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            preview = (message[:50] + "...") if len(message) > 50 else message
            writer.writerow([timestamp, recipient, preview, status])

class SeleniumEngine:
    """Handles browser automation using Selenium."""
    
    def __init__(self):
        self.driver = None
        self.wait = None
        self._lock = threading.RLock()
        
    def _cleanup_profile(self):
        """Removes lock files that cause 'session not created' errors."""
        abs_path = os.path.abspath(PROFILE_DIR)
        lock_files = [
            os.path.join(abs_path, "SingletonLock"),
            os.path.join(abs_path, "DevToolsActivePort")
        ]
        for lock_file in lock_files:
            try:
                if os.path.exists(lock_file):
                    os.remove(lock_file)
                    print(f"{Fore.CYAN}[System] Removed stale lock file: {os.path.basename(lock_file)}")
            except Exception as e:
                print(f"{Fore.YELLOW}[Warning] Could not remove {lock_file}: {e}")

    def start_driver(self):
        """Starts Chrome with a persistent profile. Reuses if already open."""
        with self._lock:
            if self.driver:
                try:
                    # Check if driver is still responsive
                    self.driver.current_url
                    return
                except:
                    print(f"{Fore.YELLOW}[Info] Browser lost. Restarting...")
                    self.driver = None

            print(f"{Fore.YELLOW}[System] Starting browser...")
            self._cleanup_profile()
            
            chrome_options = Options()
            abs_profile_path = os.path.abspath(PROFILE_DIR)
            chrome_options.add_argument(f"user-data-dir={abs_profile_path}")
            chrome_options.add_argument("--no-sandbox")
            chrome_options.add_argument("--disable-dev-shm-usage")
            # Prevents crashing if browser is already open in another thread
            chrome_options.add_argument("--remote-debugging-port=9222") 
            
            try:
                service = Service(ChromeDriverManager().install())
                self.driver = webdriver.Chrome(service=service, options=chrome_options)
                self.wait = WebDriverWait(self.driver, 60)
                print(f"{Fore.GREEN}[System] Browser ready: {abs_profile_path}")
            except Exception as e:
                print(f"{Fore.RED}[Error] Failed to start Chrome Driver: {str(e)}")
                # One last attempt to clean and retry if first attempt fails
                self._cleanup_profile()
                sys.exit(1)

    def check_login(self):
        """Waits for WhatsApp Web to load. Prompts for QR if first run."""
        self.driver.get("https://web.whatsapp.com/")
        print(f"{Fore.YELLOW}[Info] Checking login status...")
        
        # Buffer to allow initial redirect/loading
        time.sleep(5)
        
        try:
            # Gold standard: Sidebar (success) or Canvas (QR Scan needed)
            indicator = WebDriverWait(self.driver, 15).until(
                EC.presence_of_element_located((By.XPATH, "//div[@id='side'] | //canvas"))
            )
            
            # If we found side, we are logged in
            if self.driver.find_elements(By.XPATH, "//div[@id='side']"):
                print(f"{Fore.GREEN}[Success] Already logged in.")
                return
            
            print(f"{Fore.YELLOW}[Action Required] QR Code Scan needed!")
        except Exception:
            print(f"{Fore.YELLOW}[Action Required] QR Code Scan needed (Timeout waiting for UI)!")

        # Scan loop
        for i in range(60, 0, -1):
            sys.stdout.write(f"\rWaiting for QR Scan... {i} seconds left ")
            sys.stdout.flush()
            try:
                # Check for Sidebar every second
                if self.driver.find_elements(By.XPATH, "//div[@id='side']"):
                    print(f"\n{Fore.GREEN}[Success] Login verified!")
                    return
            except:
                pass
            time.sleep(1)
            
        print(f"\n{Fore.RED}[Error] Timeout waiting for QR scan. Please restart and try again.")
        self.driver.quit()
        sys.exit(1)

    def send_message(self, phone: str, message: str, image_path: Optional[str] = None) -> bool:
        """Sends a message to a specific phone number. Optionally sends one image after the text (same chat)."""
        with self._lock:
            if not phone.startswith("+"):
                print(f"{Fore.RED}[Error] Invalid phone format: {phone}. Must start with +.")
                return False

            try:
                self.start_driver() # Re-check if driver is alive
                encoded_message = urllib.parse.quote(message)
                url = f"https://web.whatsapp.com/send?phone={phone.strip('+')}&text={encoded_message}"
                self.driver.get(url)
                
                # Wait for send button or input box
                strategies = [
                    (By.XPATH, "//button[@aria-label='Send']"),
                    (By.XPATH, "//span[@data-testid='send']"),
                    (By.XPATH, "//div[@contenteditable='true'][@data-tab='10']")
                ]
                
                target = None
                for by, value in strategies:
                    try:
                        target = WebDriverWait(self.driver, 15).until(EC.element_to_be_clickable((by, value)))
                        if target: break
                    except:
                        continue
                
                if not target:
                    print(f"{Fore.RED}[Error] Could not find send button/input for {phone}")
                    DataManager.log_message(phone, message, "FAILED (Element Not Found)")
                    return False

                if "Send" in target.get_attribute("aria-label") or target.get_attribute("data-testid") == "send":
                    target.click()
                else:
                    target.send_keys(Keys.ENTER)
                
                print(f"{Fore.GREEN}[Success] Message sent to {phone}!")
                DataManager.log_message(phone, message, "SENT")
                if image_path and os.path.isfile(image_path):
                    img_ok = self._send_image_in_current_chat(image_path)
                    if not img_ok:
                        print(f"{Fore.YELLOW}[Warning] Text sent but image attach failed for {phone}")
                print(f"{Fore.CYAN}[Info] Waiting 7s before closing browser session...")
                time.sleep(7)
                try:
                    self.driver.quit()
                except Exception:
                    pass
                self.driver = None
                self.wait = None
                return True
            except Exception as e:
                print(f"{Fore.RED}[Error] Failed to send to {phone}: {str(e)}")
                DataManager.log_message(phone, message, f"FAILED ({str(e)})")
                return False

    def _send_image_in_current_chat(self, image_path: str) -> bool:
        """After a text message, attach and send one image in the open chat."""
        try:
            abs_img = os.path.abspath(image_path)
            if not os.path.isfile(abs_img):
                return False
            time.sleep(1.5)

            chosen = None
            inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
            for inp in inputs:
                acc = (inp.get_attribute("accept") or "").lower()
                if "image" in acc or not acc.strip():
                    chosen = inp
                    break

            if not chosen:
                clicked = False
                for xp in (
                    "//div[@aria-label='Attach']",
                    "//button[@aria-label='Attach']",
                    "//span[@data-icon='attach-menu-plus']",
                    "//span[@data-icon='plus']",
                    "//div[@title='Attach']",
                ):
                    for el in self.driver.find_elements(By.XPATH, xp):
                        try:
                            if el.is_displayed():
                                el.click()
                                clicked = True
                                break
                        except Exception:
                            continue
                    if clicked:
                        break

                time.sleep(1.2)
                inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[type='file']")
                for inp in inputs:
                    acc = (inp.get_attribute("accept") or "").lower()
                    if "image" in acc or not acc.strip():
                        chosen = inp
                        break
                if not chosen and inputs:
                    chosen = inputs[0]

            if not chosen:
                print(f"{Fore.RED}[Error] No file input for image attach")
                return False

            chosen.send_keys(abs_img)
            time.sleep(3.5)

            send_strategies = [
                (By.XPATH, "//div[@aria-label='Send']"),
                (By.XPATH, "//span[@data-testid='send']"),
                (By.XPATH, "//button[@aria-label='Send']"),
                (By.XPATH, "//span[@data-icon='send']"),
                (By.XPATH, "//*[@data-icon='send']/ancestor::button"),
            ]

            for by, val in send_strategies:
                try:
                    candidates = self.driver.find_elements(by, val)
                    for b in reversed(candidates):
                        try:
                            if b.is_displayed():
                                b.click()
                                time.sleep(2)
                                print(f"{Fore.GREEN}[Success] Image sent in chat.")
                                return True
                        except Exception:
                            continue
                except Exception:
                    continue

            print(f"{Fore.YELLOW}[Info] Button click failed, attempting Enter key fallback...")
            try:
                body = self.driver.find_element(By.TAG_NAME, "body")
                body.send_keys(Keys.ENTER)
                time.sleep(2)
                print(f"{Fore.GREEN}[Success] confirmation sent via Enter key.")
                return True
            except Exception as fe:
                print(f"{Fore.RED}[Error] Enter fallback failed: {str(fe)}")

            print(f"{Fore.RED}[Error] Could not click Send for image preview")
            return False
        except Exception as e:
            print(f"{Fore.RED}[Error] Image send failed: {str(e)}")
            return False

class TemplateManager:
    @staticmethod
    def save_template(name: str, message: str):
        data = DataManager.load_data()
        data["templates"][name] = message
        DataManager.save_data(data)
        print(f"{Fore.GREEN}[Success] Template '{name}' saved.")

    @staticmethod
    def list_templates():
        data = DataManager.load_data()
        templates = data.get("templates", {})
        if not templates:
            print(f"{Fore.YELLOW}[Info] No templates found.")
            return
        table = [[name, content] for name, content in templates.items()]
        print(tabulate(table, headers=["Name", "Template Content"], tablefmt="grid"))

    @staticmethod
    def render_template(content: str, variables: Dict[str, str]) -> str:
        for key, value in variables.items():
            content = content.replace(f"{{{{{key}}}}}", value)
        return content

class JobScheduler:
    def __init__(self, engine: SeleniumEngine):
        self.engine = engine
        self.data = DataManager.load_data()
        self._running = False
        self._scheduler_thread: Optional[threading.Thread] = None

    def add_job(self, to: str, message: str, repeat: str, at: str):
        job_id = str(uuid.uuid4())[:8]
        new_job = {"id": job_id, "to": to, "message": message, "repeat": repeat, "at": at}
        self.data["scheduled_jobs"].append(new_job)
        DataManager.save_data(self.data)
        
        # Dynamically register the job if scheduler is already running
        if self._running:
            self._schedule_item(new_job)
            
        print(f"{Fore.GREEN}[Success] Scheduled job {job_id} created ({repeat} at {at}).")
        return job_id

    def list_jobs(self):
        jobs = self.data.get("scheduled_jobs", [])
        if not jobs:
            print(f"{Fore.YELLOW}[Info] No scheduled jobs found.")
            return
        table = [[j["id"], j["to"], j["repeat"], j["at"], j["message"][:30]+"..."] for j in jobs]
        print(tabulate(table, headers=["ID", "To", "Repeat", "At", "Message"], tablefmt="grid"))

    def cancel_job(self, job_id: str):
        original_count = len(self.data["scheduled_jobs"])
        self.data["scheduled_jobs"] = [j for j in self.data["scheduled_jobs"] if j["id"] != job_id]
        if len(self.data["scheduled_jobs"]) < original_count:
            DataManager.save_data(self.data)
            try:
                schedule.clear(job_id)
            except Exception:
                pass
            print(f"{Fore.GREEN}[Success] Job {job_id} cancelled.")
        else:
            print(f"{Fore.RED}[Error] Job ID {job_id} not found.")

    def run_scheduler(self, daemon_thread: bool = True):
        """Starts the scheduling loop in a background thread.
        Use daemon_thread=False when the process must stay alive without a menu (e.g. Task Scheduler + pythonw)."""
        if self._running:
            return

        self._running = True
        for job in self.data.get("scheduled_jobs", []):
            self._schedule_item(job)

        def scheduler_loop():
            while self._running:
                schedule.run_pending()
                time.sleep(5)

        self._scheduler_thread = threading.Thread(target=scheduler_loop, daemon=daemon_thread)
        self._scheduler_thread.start()
        print(f"{Fore.CYAN}[System] Background scheduler is now monitoring jobs.")

    def _schedule_item(self, job: Dict[str, Any]):
        job_id = job["id"]
        phones = [p.strip() for p in (job.get("to") or "").split(",") if p.strip()]
        repeat = (job.get("repeat") or "once").strip().lower()

        def task():
            self.engine.start_driver()
            self.engine.check_login()
            for phone in phones:
                self.engine.send_message(phone, job["message"])
            if repeat == "once":
                self.data["scheduled_jobs"] = [
                    j for j in self.data["scheduled_jobs"] if j["id"] != job_id
                ]
                DataManager.save_data(self.data)
                try:
                    schedule.clear(job_id)
                except Exception:
                    pass

        if repeat == "once":
            schedule.every().day.at(job["at"]).do(task).tag(job_id)
        elif repeat == "daily":
            schedule.every().day.at(job["at"]).do(task).tag(job_id)
        elif repeat == "weekly":
            schedule.every().monday.at(job["at"]).do(task).tag(job_id)

def bulk_send(engine: SeleniumEngine, csv_file: str, message_template: str):
    if not os.path.exists(csv_file):
        print(f"{Fore.RED}[Error] CSV file {csv_file} not found.")
        return
    engine.start_driver()
    engine.check_login()
    try:
        with open(csv_file, mode='r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                name = row.get("name", "Contact")
                phone = row.get("phone")
                if not phone: continue
                msg = message_template.replace("{{name}}", name)
                engine.send_message(phone, msg)
                delay = random.randint(5, 10)
                print(f"{Fore.CYAN}[Info] Waiting {delay}s (Randomized Delay)...")
                time.sleep(delay)
    except Exception as e:
        print(f"{Fore.RED}[Error] Bulk failed: {str(e)}")

def get_multiline_input(prompt_text: str) -> str:
    print(f"{Fore.CYAN}{prompt_text} (Type 'END' on a new line or press Enter twice to finish):")
    lines = []
    while True:
        line = input()
        if line.strip().upper() == 'END' or (not line and lines and not lines[-1]):
            break
        if not line and not lines: # If first line is empty, maybe they just want empty? Usually not.
            # But let's allow Enter twice for convenience
            if len(lines) > 0 and lines[-1] == "": break
        lines.append(line)
    
    # Remove the last empty line if it was used as a terminator
    if lines and lines[-1] == "":
        lines.pop()
        
    return "\n".join(lines).strip()

def interactive_menu():
    engine = SeleniumEngine()
    scheduler = JobScheduler(engine)
    
    # Start scheduler immediately to monitor jobs
    scheduler.run_scheduler()
    
    while True:
        print(f"\n{Fore.MAGENTA}=== WhatsApp Bot (Selenium) ===")
        print("1. Send message now")
        print("2. Schedule a message")
        print("3. Manage templates")
        print("4. View scheduled jobs")
        print("5. View message log")
        print("6. Exit")
        choice = input(f"{Fore.CYAN}Select (1-6): ").strip()
        
        if choice == '1':
            to = input("Phone(s) (comma-sep): ").strip()
            msg = get_multiline_input("Enter message")
            engine.start_driver()
            engine.check_login()
            for p in to.split(","):
                engine.send_message(p.strip(), msg)
        elif choice == '2':
            to = input("Phone: ").strip()
            msg = get_multiline_input("Enter message")
            at = input("Time (HH:MM): ").strip()
            repeat = input("Repeat (once/daily/weekly): ").strip().lower() or "once"
            scheduler.add_job(to, msg, repeat, at)
        elif choice == '3':
            print("1. Save 2. List")
            if input("Select: ").strip() == '1':
                name = input("Name: ").strip()
                content = get_multiline_input("Enter template content")
                TemplateManager.save_template(name, content)
            else: TemplateManager.list_templates()
        elif choice == '4':
            scheduler.list_jobs()
            cancel = input("ID to cancel: ").strip()
            if cancel: scheduler.cancel_job(cancel)
        elif choice == '5':
            if os.path.exists(LOG_FILE):
                with open(LOG_FILE, "r") as f:
                    print(tabulate(list(csv.reader(f))[1:], headers=["Time", "To", "Msg", "Status"], tablefmt="grid"))
            else: print("No logs.")
        elif choice == '6': break

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--send")
    parser.add_argument("--message", default="")
    parser.add_argument(
        "--message-file",
        default=None,
        help="Read message body from a UTF-8 file (recommended for long text; avoids shell quoting limits).",
    )
    parser.add_argument(
        "--image",
        default=None,
        help="Local image path to send after the text (same conversation).",
    )
    parser.add_argument("--bulk")
    parser.add_argument("--template", choices=["save", "list"])
    parser.add_argument("--name")
    parser.add_argument("--use-template")
    parser.add_argument("--schedule", action="store_true")
    parser.add_argument("--to")
    parser.add_argument("--repeat")
    parser.add_argument("--at")
    parser.add_argument("--list-jobs", action="store_true")
    parser.add_argument("--log", action="store_true")
    parser.add_argument(
        "--daemon",
        action="store_true",
        help="Run only the job scheduler (no menu). Use with pythonw.exe from Task Scheduler.",
    )

    args = parser.parse_args()
    if args.daemon:
        _daemon_log = open(
            os.path.join(DATA_DIR, "daemon.log"), "a", encoding="utf-8", buffering=1
        )
        sys.stdout = _daemon_log
        sys.stderr = _daemon_log
        print(f"[{datetime.datetime.now().isoformat()}] Daemon starting")

    engine = SeleniumEngine()
    scheduler = JobScheduler(engine)

    if len(sys.argv) == 1:
        interactive_menu()
    elif args.daemon:
        scheduler.run_scheduler(daemon_thread=False)
        if scheduler._scheduler_thread:
            scheduler._scheduler_thread.join()
    elif args.log:
        if os.path.exists(LOG_FILE):
            with open(LOG_FILE, "r") as f:
                print(tabulate(list(csv.reader(f))[1:], headers=["Time", "To", "Msg", "Status"], tablefmt="grid"))
    elif args.list_jobs: scheduler.list_jobs()
    elif args.template == "save": TemplateManager.save_template(args.name, args.message)
    elif args.template == "list": TemplateManager.list_templates()
    elif args.bulk: bulk_send(engine, args.bulk, args.message)
    elif args.schedule: scheduler.add_job(args.to, args.message, args.repeat or "once", args.at)
    elif args.send:
        msg = args.message or ""
        if args.message_file:
            try:
                with open(args.message_file, "r", encoding="utf-8") as mf:
                    msg = mf.read()
            except OSError as e:
                print(f"{Fore.RED}[Error] Could not read --message-file: {e}")
                sys.exit(1)
        engine.start_driver()
        engine.check_login()
        if args.use_template:
            tpl = DataManager.load_data().get("templates", {}).get(args.use_template)
            if tpl is not None:
                msg = tpl
        all_ok = True
        for p in args.send.split(","):
            if not engine.send_message(p.strip(), msg, args.image):
                all_ok = False
        sys.exit(0 if all_ok else 1)

if __name__ == "__main__":
    main()
