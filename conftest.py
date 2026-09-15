"""Test-session setup shared by every pytest run in this repository.

Windows only: gltest direct mode unlinks the temp file it has just made the process's
stdin, which Windows refuses (WinError 32). Defer that delete until the process exits.
"""

import atexit
import os
import sys

if sys.platform == "win32":
    import gltest.direct.loader as _gltest_loader

    _original_inject = _gltest_loader._inject_message_to_fd0
    _pending_temp_files: list[str] = []

    def _inject_message_windows_safe(vm):
        real_unlink = os.unlink

        def unlink_later_if_open(path, *args, **kwargs):
            try:
                real_unlink(path, *args, **kwargs)
            except PermissionError:
                _pending_temp_files.append(path)

        os.unlink = unlink_later_if_open
        try:
            return _original_inject(vm)
        finally:
            os.unlink = real_unlink

    @atexit.register
    def _remove_pending_temp_files():
        for path in _pending_temp_files:
            try:
                os.unlink(path)
            except OSError:
                pass

    _gltest_loader._inject_message_to_fd0 = _inject_message_windows_safe
