# Rich Library Test Examples for ANSI Output Rendering
# This file contains various rich library examples to test our new ANSI-to-React rendering

from rich.console import Console
from rich.text import Text
from rich.panel import Panel
from rich.table import Table
from rich.progress import Progress, BarColumn, TextColumn
from rich.syntax import Syntax
from rich.tree import Tree
from rich.columns import Columns
from rich.align import Align
from rich import print as rprint
import time

console = Console()

print("🎨 Testing Rich Library ANSI Output Rendering")
print("=" * 50)

# Test 1: Basic colored text
console.print("✨ Test 1: Basic Rich Colors", style="bold blue")
console.print("This is [red]red text[/red]")
console.print("This is [green]green text[/green]")
console.print("This is [yellow]yellow text[/yellow]")
console.print("This is [blue]blue text[/blue]")
console.print("This is [magenta]magenta text[/magenta]")
console.print("This is [cyan]cyan text[/cyan]")
console.print("")

# Test 2: Mixed styling
console.print("✨ Test 2: Mixed Styling", style="bold blue")
console.print("This is [bold red]bold red[/bold red] text")
console.print("This is [italic green]italic green[/italic green] text")
console.print("This is [underline yellow]underlined yellow[/underline yellow] text")
console.print(
    "Mix [bold cyan]bold cyan[/bold cyan] with [dim white]dim white[/dim white]"
)
console.print("")

# Test 3: Text objects with multiple styles
console.print("✨ Test 3: Text Objects", style="bold blue")
text = Text("Hello, World!")
text.stylize("bold red", 0, 6)  # "Hello,"
text.stylize("italic blue", 7, 13)  # "World!"
console.print(text)

# Create rainbow text
rainbow_text = Text("Rainbow Colors!")
colors = ["red", "yellow", "green", "cyan", "blue", "magenta"]
for i, char in enumerate("Rainbow Colors!"):
    if char != " ":
        rainbow_text.stylize(colors[i % len(colors)], i, i + 1)
console.print(rainbow_text)
console.print("")

# Test 4: Panels and boxes
console.print("✨ Test 4: Panels and Boxes", style="bold blue")
console.print(Panel("This is a [red]red panel[/red] with borders", title="Info"))
console.print(
    Panel("This is a [green]success panel[/green]", title="✓ Success", style="green")
)
console.print(
    Panel("This is a [yellow]warning panel[/yellow]", title="⚠ Warning", style="yellow")
)
console.print(Panel("This is an [red]error panel[/red]", title="❌ Error", style="red"))
console.print("")

# Test 5: Tables
console.print("✨ Test 5: Colored Tables", style="bold blue")
table = Table(title="Sample Data")
table.add_column("Name", style="cyan", no_wrap=True)
table.add_column("Age", style="magenta", justify="right")
table.add_column("Status", style="green")

table.add_row("Alice", "25", "Active")
table.add_row("Bob", "30", "Inactive")
table.add_row("Charlie", "35", "Active")

console.print(table)
console.print("")

# Test 6: Progress bars
console.print("✨ Test 6: Progress Bars", style="bold blue")
with Progress(
    TextColumn("[progress.description]{task.description}"),
    BarColumn(),
    TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
) as progress:
    task = progress.add_task("Processing...", total=100)
    for i in range(100):
        progress.update(task, advance=1)
        time.sleep(0.01)  # Small delay to see animation

console.print("✅ Progress complete!")
console.print("")

# Test 7: Syntax highlighting
console.print("✨ Test 7: Syntax Highlighting", style="bold blue")
code = '''
def fibonacci(n):
    """Calculate fibonacci number recursively."""
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Test the function
result = fibonacci(10)
print(f"Fibonacci(10) = {result}")
'''

syntax = Syntax(code, "python", theme="monokai", line_numbers=True)
console.print(syntax)
console.print("")

# Test 8: Tree structure
console.print("✨ Test 8: Tree Structure", style="bold blue")
tree = Tree("🌳 Project Structure")
tree.add("📁 src/")
tree.add("📁 tests/")
docs = tree.add("📁 docs/")
docs.add("📄 README.md")
docs.add("📄 API.md")
src = tree.add("📁 components/")
src.add("⚛️ Button.tsx")
src.add("⚛️ Modal.tsx")

console.print(tree)
console.print("")

# Test 9: Columns layout
console.print("✨ Test 9: Column Layout", style="bold blue")
console.print(
    Columns(
        [
            Panel("Column 1\n[red]Red content[/red]", style="blue"),
            Panel("Column 2\n[green]Green content[/green]", style="green"),
            Panel("Column 3\n[yellow]Yellow content[/yellow]", style="yellow"),
        ]
    )
)
console.print("")

# Test 10: Rich print function
console.print("✨ Test 10: Rich Print Function", style="bold blue")
rprint("Using [bold blue]rprint()[/bold blue] for easy markup!")
rprint({"key": "value", "number": 42, "list": [1, 2, 3]})
rprint(["apple", "banana", "cherry"])
console.print("")

# Test 11: Status messages
console.print("✨ Test 11: Status Messages", style="bold blue")
console.print("✅ [green]Success:[/green] Operation completed successfully")
console.print("⚠️  [yellow]Warning:[/yellow] This is a warning message")
console.print("❌ [red]Error:[/red] Something went wrong")
console.print("ℹ️  [blue]Info:[/blue] Here's some information")
console.print("🔄 [cyan]Processing:[/cyan] Working on it...")
console.print("")

# Test 12: Emoji and Unicode
console.print("✨ Test 12: Emoji and Unicode", style="bold blue")
console.print("🎉 [rainbow]Celebration[/rainbow] time!")
console.print("🚀 [bold green]Launch successful![/bold green]")
console.print("💡 [yellow]Bright idea:[/yellow] Use more colors!")
console.print("⭐ [gold1]Five star rating[/gold1] ⭐⭐⭐⭐⭐")
console.print("")

# Final message
console.print(
    Panel.fit(
        "[bold green]🎊 Rich ANSI Test Complete! 🎊[/bold green]\n"
        "[dim]All colors should render beautifully with your ansi-to-react setup![/dim]",
        style="green",
    )
)

print("\n" + "=" * 50)
print("🏁 Test file execution complete!")
