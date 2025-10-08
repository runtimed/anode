"""
Pseudo-IPython shell setup and configuration for Runt Runtime

This module provides a pseudo-IPython shell instance that mimics IPython
functionality with enhanced display capabilities, interrupt handling, and
error formatting. It's designed as a sandbox environment to demonstrate
runt working with an interactive Python environment.
"""

import os
import json


from IPython.core.interactiveshell import InteractiveShell
from IPython.core.history import HistoryManager

from runt_runtime_display import (
    RichDisplayHook,
    RichDisplayPublisher,
    setup_rich_formatters,
)
from runt_runtime_display import (
    js_display_callback,
    js_execution_callback,
    js_clear_callback,
)
from runt_runtime_interrupt_patches import setup_interrupt_patches


class LiteHistoryManager(HistoryManager):
    """Lightweight history manager for web environment"""

    def __init__(self, shell=None, config=None, **traits):
        self.enabled = False
        super().__init__(shell=shell, config=config, **traits)


# Set up environment for rich terminal output
os.environ.update(
    {
        "TERM": "xterm-256color",
        "FORCE_COLOR": "1",
        "COLORTERM": "truecolor",
        "CLICOLOR": "1",
        "CLICOLOR_FORCE": "1",
    }
)

# Create pseudo-IPython shell instance with enhanced display capabilities
shell = InteractiveShell.instance(
    displayhook_class=RichDisplayHook,
    display_pub_class=RichDisplayPublisher,
)

# Override history manager
shell.history_manager = LiteHistoryManager(shell=shell, parent=shell)


def format_exception(exc_type, exc_value, exc_traceback):
    """Enhanced exception formatting with rich output"""
    try:
        import traceback

        # Format the traceback
        tb_lines = traceback.format_exception(exc_type, exc_value, exc_traceback)

        # Join and clean up the traceback
        formatted_tb = "".join(tb_lines).strip()

        return formatted_tb
    except Exception:
        # Fallback to basic formatting if rich formatting fails
        return f"{exc_type.__name__}: {exc_value}"


def initialize_ipython_environment():
    """Initialize the pseudo-IPython sandbox environment with all setup functions"""

    # Set up display callbacks on the shell's display publisher and hook
    if hasattr(shell, "display_pub") and hasattr(shell.display_pub, "js_callback"):
        shell.display_pub.js_callback = js_display_callback

    if hasattr(shell, "displayhook") and hasattr(shell.displayhook, "js_callback"):
        shell.displayhook.js_callback = js_execution_callback

    if hasattr(shell, "display_pub") and hasattr(
        shell.display_pub, "js_clear_callback"
    ):
        shell.display_pub.js_clear_callback = js_clear_callback

    # Apply rich formatters
    setup_rich_formatters()

    # Set up interrupt patches
    setup_interrupt_patches()

    print("Pseudo-IPython environment ready with rich display support")


def get_completions(code: str, cursor_pos: int) -> str:
    """Get code completions using IPython's built-in completer"""
    try:
        # Ensure shell has latest execution context
        import __main__

        shell.user_ns = __main__.__dict__

        # Parse cursor position to find current line and position within line
        lines = code.split("\n")
        current_pos = 0
        line_number = 0
        cursor_in_line = cursor_pos

        # Find which line the cursor is on
        for i, line in enumerate(lines):
            line_end = current_pos + len(line)
            if cursor_pos <= line_end:
                line_number = i
                cursor_in_line = cursor_pos - current_pos
                break
            current_pos = line_end + 1  # +1 for newline character
        else:
            # Cursor is at the very end
            line_number = len(lines) - 1
            cursor_in_line = len(lines[-1]) if lines else 0

        current_line = lines[line_number] if line_number < len(lines) else ""

        # For debugging
        print(f"[COMPLETION DEBUG] Code: {repr(code[:50])}...")
        print(f"[COMPLETION DEBUG] Cursor pos: {cursor_pos}")
        print(f"[COMPLETION DEBUG] Current line: {repr(current_line)}")
        print(f"[COMPLETION DEBUG] Cursor in line: {cursor_in_line}")

        # Get completions using IPython's completer
        try:
            completions = list(
                shell.Completer.completions(current_line, cursor_in_line)
            )
            print(f"[COMPLETION DEBUG] Found {len(completions)} completions")
            for i, comp in enumerate(completions[:5]):  # Show first 5
                print(
                    f"[COMPLETION DEBUG]   {i}: {comp.text} ({comp.start}-{comp.end})"
                )
        except Exception as comp_error:
            print(f"[COMPLETION DEBUG] Completer error: {comp_error}")
            completions = []

        # Calculate absolute cursor positions
        if completions:
            first_comp = completions[0]
            abs_start = current_pos + first_comp.start
            abs_end = current_pos + first_comp.end
        else:
            abs_start = cursor_pos
            abs_end = cursor_pos

        # If no completions found, try basic Python builtins as fallback
        if not completions and current_line.strip():
            # Get the word being completed
            word_part = (
                current_line[:cursor_in_line].split()[-1]
                if current_line[:cursor_in_line].split()
                else ""
            )

            # Basic Python builtins that might match
            python_builtins = [
                "abs",
                "all",
                "any",
                "ascii",
                "bin",
                "bool",
                "bytearray",
                "bytes",
                "callable",
                "chr",
                "classmethod",
                "compile",
                "complex",
                "delattr",
                "dict",
                "dir",
                "divmod",
                "enumerate",
                "eval",
                "exec",
                "filter",
                "float",
                "format",
                "frozenset",
                "getattr",
                "globals",
                "hasattr",
                "hash",
                "help",
                "hex",
                "id",
                "input",
                "int",
                "isinstance",
                "issubclass",
                "iter",
                "len",
                "list",
                "locals",
                "map",
                "max",
                "memoryview",
                "min",
                "next",
                "object",
                "oct",
                "open",
                "ord",
                "pow",
                "print",
                "property",
                "range",
                "repr",
                "reversed",
                "round",
                "set",
                "setattr",
                "slice",
                "sorted",
                "staticmethod",
                "str",
                "sum",
                "super",
                "tuple",
                "type",
                "vars",
                "zip",
            ]

            # Filter builtins that start with the current word part
            if word_part:
                matches = [
                    builtin
                    for builtin in python_builtins
                    if builtin.startswith(word_part)
                ]
                if matches:
                    print(f"[COMPLETION DEBUG] Using fallback builtins: {matches}")
                    word_start = cursor_pos - len(word_part)
                    result = {
                        "matches": matches,
                        "cursor_start": word_start,
                        "cursor_end": cursor_pos,
                    }
                else:
                    result = {
                        "matches": [],
                        "cursor_start": cursor_pos,
                        "cursor_end": cursor_pos,
                    }
            else:
                result = {
                    "matches": [],
                    "cursor_start": cursor_pos,
                    "cursor_end": cursor_pos,
                }
        else:
            result = {
                "matches": [c.text for c in completions],
                "cursor_start": abs_start,
                "cursor_end": abs_end,
            }

        print(f"[COMPLETION DEBUG] Final result: {result}")
        return json.dumps(result)
    except Exception as e:
        print(f"[COMPLETION DEBUG] Exception: {e}")
        result = {"matches": [], "cursor_start": cursor_pos, "cursor_end": cursor_pos}
        return json.dumps(result)
