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
        import sys

        # Sync both user namespace and global namespace with main execution context
        main_dict = __main__.__dict__
        shell.user_ns.update(main_dict)
        shell.user_global_ns.update(main_dict)

        # Also sync with current globals() if available
        try:
            import builtins

            current_globals = getattr(builtins, "_current_globals", {})
            if current_globals:
                shell.user_ns.update(current_globals)
                shell.user_global_ns.update(current_globals)
        except:
            pass

        # Force completer to refresh its namespace cache
        if hasattr(shell.Completer, "namespace"):
            shell.Completer.namespace = shell.user_ns
        if hasattr(shell.Completer, "global_namespace"):
            shell.Completer.global_namespace = shell.user_global_ns

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

        # If no completions found, try Jedi as fallback for module attributes
        if not completions and current_line.strip() and "." in current_line:
            try:
                import jedi

                print(f"[COMPLETION DEBUG] Trying Jedi for: {current_line}")

                # Create Jedi script with current execution context
                script = jedi.Script(
                    code=current_line,
                    line=1,
                    column=cursor_in_line,
                    path="<stdin>",
                )

                # Set namespace to include executed modules
                if hasattr(script, "_inference_state"):
                    # Try to add current namespace to Jedi
                    try:
                        script._inference_state.builtins_module._name_to_value.update(
                            shell.user_ns
                        )
                    except:
                        pass

                jedi_completions = script.completions()
                if jedi_completions:
                    completions_list = []
                    for comp in jedi_completions:
                        # Create fake completion objects with text attribute
                        class FakeCompletion:
                            def __init__(self, text, start, end):
                                self.text = text
                                self.start = start
                                self.end = end

                        # Calculate positions relative to current line
                        comp_start = (
                            comp.start_pos[1] if comp.start_pos else cursor_in_line
                        )
                        comp_end = cursor_in_line

                        fake_comp = FakeCompletion(comp.name, comp_start, comp_end)
                        completions_list.append(fake_comp)

                    completions = completions_list
                    abs_start = current_pos + (
                        completions[0].start if completions else cursor_in_line
                    )
                    abs_end = current_pos + (
                        completions[0].end if completions else cursor_in_line
                    )

                    print(
                        f"[COMPLETION DEBUG] Jedi found {len(completions)} completions: {[c.text for c in completions[:5]]}"
                    )

            except ImportError:
                print("[COMPLETION DEBUG] Jedi not available")
            except Exception as jedi_error:
                print(f"[COMPLETION DEBUG] Jedi error: {jedi_error}")

        # If still no completions and we have module.attribute pattern, try manual completion
        if not completions and current_line.strip() and "." in current_line:
            # Extract module name and partial attribute
            try:
                line_before_cursor = current_line[:cursor_in_line]
                if "." in line_before_cursor:
                    parts = line_before_cursor.split(".")
                    if len(parts) >= 2:
                        module_name = parts[-2].split()[-1]  # Get last word before dot
                        partial_attr = parts[-1] if len(parts) > 1 else ""

                        # Handle case where cursor is right after dot (empty partial)
                        if line_before_cursor.endswith("."):
                            partial_attr = ""

                        print(
                            f"[COMPLETION DEBUG] Manual completion for module: {module_name}, partial: {partial_attr}"
                        )

                        # Try to get the module from current namespace
                        module_obj = None
                        if module_name in shell.user_ns:
                            module_obj = shell.user_ns[module_name]
                        elif module_name in __main__.__dict__:
                            module_obj = __main__.__dict__[module_name]

                        if module_obj and hasattr(module_obj, "__dict__"):
                            # Get all attributes from the module
                            attrs = [
                                attr
                                for attr in dir(module_obj)
                                if not attr.startswith("_")
                                and attr.startswith(partial_attr)
                            ]

                            # For empty partial, limit to reasonable number of completions
                            if partial_attr == "" and len(attrs) > 20:
                                attrs = attrs[:20]  # Show first 20 attributes

                            if attrs:
                                print(
                                    f"[COMPLETION DEBUG] Found manual completions: {attrs[:5]}"
                                )

                                # Create fake completion objects
                                class FakeCompletion:
                                    def __init__(self, text):
                                        self.text = text
                                        self.start = (
                                            len(partial_attr) if partial_attr else 0
                                        )
                                        self.end = (
                                            len(partial_attr) if partial_attr else 0
                                        )

                                completions = [FakeCompletion(attr) for attr in attrs]

                                # Calculate absolute positions
                                attr_start_pos = cursor_pos - len(partial_attr)
                                abs_start = attr_start_pos
                                abs_end = cursor_pos

                        # Fallback: common module completions for well-known modules
                        elif not completions:
                            common_modules = {
                                "math": [
                                    "pi",
                                    "e",
                                    "sqrt",
                                    "sin",
                                    "cos",
                                    "tan",
                                    "log",
                                    "exp",
                                    "floor",
                                    "ceil",
                                ],
                                "os": [
                                    "path",
                                    "listdir",
                                    "getcwd",
                                    "chdir",
                                    "mkdir",
                                    "remove",
                                    "rename",
                                ],
                                "sys": [
                                    "argv",
                                    "exit",
                                    "path",
                                    "version",
                                    "platform",
                                    "stdout",
                                    "stdin",
                                ],
                                "random": [
                                    "random",
                                    "randint",
                                    "choice",
                                    "shuffle",
                                    "uniform",
                                    "seed",
                                ],
                                "time": [
                                    "time",
                                    "sleep",
                                    "strftime",
                                    "localtime",
                                    "gmtime",
                                ],
                                "json": ["loads", "dumps", "load", "dump"],
                                "datetime": [
                                    "datetime",
                                    "date",
                                    "time",
                                    "timedelta",
                                    "now",
                                    "today",
                                ],
                                "numpy": [
                                    "array",
                                    "zeros",
                                    "ones",
                                    "arange",
                                    "linspace",
                                    "reshape",
                                    "sum",
                                    "mean",
                                ],
                                "pandas": [
                                    "DataFrame",
                                    "Series",
                                    "read_csv",
                                    "read_json",
                                    "concat",
                                    "merge",
                                ],
                            }

                            if module_name in common_modules:
                                attrs = [
                                    attr
                                    for attr in common_modules[module_name]
                                    if attr.startswith(partial_attr)
                                ]

                                print(
                                    f"[COMPLETION DEBUG] Common module lookup for '{module_name}' with partial '{partial_attr}': found {len(attrs)} matches"
                                )

                                if attrs:
                                    print(
                                        f"[COMPLETION DEBUG] Using common module completions for {module_name}: {attrs}"
                                    )

                                    class FakeCompletion:
                                        def __init__(self, text):
                                            self.text = text
                                            self.start = len(partial_attr)
                                            self.end = len(partial_attr)

                                    completions = [
                                        FakeCompletion(attr) for attr in attrs
                                    ]
                                    attr_start_pos = cursor_pos - len(partial_attr)
                                    abs_start = attr_start_pos
                                    abs_end = cursor_pos

            except Exception as manual_error:
                print(f"[COMPLETION DEBUG] Manual completion error: {manual_error}")

        # If still no completions found, try basic Python builtins as fallback
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
