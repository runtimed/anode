# Terminal Detection Test
# This tests whether our Pyodide environment is properly configured to report as a terminal

import sys
import os

print("🔍 Terminal Detection Test")
print("=" * 40)

# Test 1: Check if stdout/stderr report as TTY
print(f"📺 sys.stdout.isatty(): {sys.stdout.isatty()}")
print(f"📺 sys.stderr.isatty(): {sys.stderr.isatty()}")

# Test 2: Check environment variables
print("\n🌍 Environment Variables:")
terminal_vars = ["TERM", "FORCE_COLOR", "COLORTERM", "CLICOLOR", "CLICOLOR_FORCE"]
for var in terminal_vars:
    value = os.environ.get(var, "NOT SET")
    print(f"   {var}: {value}")

# Test 3: Test rich detection
print("\n🎨 Rich Library Detection:")
try:
    from rich.console import Console

    # Create console without forcing terminal
    console = Console()

    print(f"   Rich detects terminal: {console.is_terminal}")
    print(f"   Rich color system: {console.color_system}")
    print(f"   Rich size: {console.size}")

    # Test actual colored output
    print("\n✨ Rich Color Test:")
    console.print("   This should be [red]RED[/red]!")
    console.print("   This should be [green]GREEN[/green]!")
    console.print("   This should be [blue]BLUE[/blue]!")
    console.print("   This should be [bold yellow]BOLD YELLOW[/bold yellow]!")

except ImportError:
    print("   Rich not available - that's okay for basic testing")

# Test 4: Test basic ANSI codes
print("\n🌈 Basic ANSI Color Test:")
print("   \033[31mThis should be RED\033[0m")
print("   \033[32mThis should be GREEN\033[0m")
print("   \033[34mThis should be BLUE\033[0m")
print("   \033[1;33mThis should be BOLD YELLOW\033[0m")

print("\n" + "=" * 40)
print("🏁 Terminal detection test complete!")

# Expected results:
# - isatty() should return True
# - Environment variables should be set
# - Rich should detect terminal and use colors
# - ANSI codes should be preserved in output
