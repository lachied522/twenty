import sys
import os
import io
import json
import base64
import contextlib
import traceback
import threading
import time

_last_activity = time.time()


def _idle_watchdog(idle_ms):
    while True:
        time.sleep(5)
        if (time.time() - _last_activity) * 1000 > idle_ms:
            os._exit(0)


def _main():
    global _last_activity

    idle_ms = int(os.environ.get("KERNEL_IDLE_TIMEOUT_MS", "0"))
    if idle_ms > 0:
        threading.Thread(target=_idle_watchdog, args=(idle_ms,), daemon=True).start()

    os.makedirs("/home/user/output", exist_ok=True)
    os.chdir("/home/user")
    namespace = {"__name__": "__main__"}

    for line in sys.stdin:
        _last_activity = time.time()
        line = line.strip()
        if not line:
            continue

        try:
            request = json.loads(line)
        except Exception:
            continue

        try:
            code = base64.b64decode(request.get("code", "")).decode("utf-8")
        except Exception:
            code = ""

        stdout_buffer = io.StringIO()
        stderr_buffer = io.StringIO()
        error = None

        with contextlib.redirect_stdout(stdout_buffer), contextlib.redirect_stderr(
            stderr_buffer
        ):
            try:
                exec(compile(code, "<cell>", "exec"), namespace)
            except SystemExit:
                pass
            except BaseException:
                error = traceback.format_exc()

        stderr_value = stderr_buffer.getvalue()
        if error:
            stderr_value = stderr_value + error

        response = {
            "stdout": stdout_buffer.getvalue(),
            "stderr": stderr_value,
            "exitCode": 1 if error else 0,
        }
        sys.stdout.write(json.dumps(response) + "\n")
        sys.stdout.flush()
        _last_activity = time.time()


_main()
