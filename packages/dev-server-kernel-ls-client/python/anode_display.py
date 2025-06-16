"""
Anode Display Utilities

This module provides enhanced display utilities for the Anode notebook system,
building on IPython's display system with additional features for rich output.
"""

import io
import json
import base64
from typing import Any, Dict, Optional, Union
from IPython.display import display, HTML, Markdown, JSON, SVG
from IPython.core.display import DisplayObject


class AnodeHTML(HTML):
    """Enhanced HTML display with Anode-specific styling support"""

    def __init__(self, data=None, url=None, filename=None, metadata=None, **kwargs):
        super().__init__(data, url, filename, metadata)
        self.anode_metadata = kwargs


class AnodeMarkdown(Markdown):
    """Enhanced Markdown display with Anode-specific features"""

    def __init__(self, data=None, url=None, filename=None, metadata=None, **kwargs):
        super().__init__(data, url, filename, metadata)
        self.anode_metadata = kwargs


class DataTable(DisplayObject):
    """Display tabular data with rich formatting"""

    def __init__(self, data, headers=None, caption=None, max_rows=100, **kwargs):
        self.data = data
        self.headers = headers
        self.caption = caption
        self.max_rows = max_rows
        self.kwargs = kwargs

    def _repr_html_(self):
        """Generate HTML table representation"""
        if hasattr(self.data, "to_html"):
            # Handle pandas DataFrames
            return self.data.to_html(max_rows=self.max_rows, classes="anode-table")

        # Handle list of lists or dicts
        if not self.data:
            return "<p>No data to display</p>"

        html = ['<table class="anode-table">']

        if self.caption:
            html.append(f"<caption>{self.caption}</caption>")

        # Headers
        if self.headers:
            html.append("<thead><tr>")
            for header in self.headers:
                html.append(f"<th>{header}</th>")
            html.append("</tr></thead>")
        elif isinstance(self.data[0], dict):
            # Auto-generate headers from dict keys
            html.append("<thead><tr>")
            for key in self.data[0].keys():
                html.append(f"<th>{key}</th>")
            html.append("</tr></thead>")

        # Body
        html.append("<tbody>")
        for i, row in enumerate(self.data[: self.max_rows]):
            html.append("<tr>")
            if isinstance(row, dict):
                for value in row.values():
                    html.append(f"<td>{value}</td>")
            else:
                for value in row:
                    html.append(f"<td>{value}</td>")
            html.append("</tr>")
        html.append("</tbody>")

        if len(self.data) > self.max_rows:
            html.append(
                f'<tfoot><tr><td colspan="100%">... and {len(self.data) - self.max_rows} more rows</td></tr></tfoot>'
            )

        html.append("</table>")
        return "".join(html)


class Progress(DisplayObject):
    """Display a progress bar"""

    def __init__(self, value=0, max_value=100, description="", bar_style="info"):
        self.value = value
        self.max_value = max_value
        self.description = description
        self.bar_style = bar_style

    def _repr_html_(self):
        percentage = (self.value / self.max_value) * 100
        return f"""
        <div class="anode-progress">
            <div class="progress-description">{self.description}</div>
            <div class="progress-bar-container">
                <div class="progress-bar progress-{self.bar_style}"
                     style="width: {percentage}%"></div>
            </div>
            <div class="progress-text">{self.value}/{self.max_value} ({percentage:.1f}%)</div>
        </div>
        """

    def update(self, value, description=None):
        """Update progress bar"""
        self.value = value
        if description is not None:
            self.description = description
        display(self)


class CodeBlock(DisplayObject):
    """Display syntax-highlighted code"""

    def __init__(self, code, language="python", line_numbers=True, theme="default"):
        self.code = code
        self.language = language
        self.line_numbers = line_numbers
        self.theme = theme

    def _repr_html_(self):
        lines = self.code.split("\n")
        html = [
            f'<div class="anode-code-block language-{self.language} theme-{self.theme}">'
        ]

        if self.line_numbers:
            html.append('<div class="code-content-with-numbers">')
            html.append('<div class="line-numbers">')
            for i in range(1, len(lines) + 1):
                html.append(f'<span class="line-number">{i}</span>')
            html.append("</div>")
            html.append('<div class="code-content">')
        else:
            html.append('<div class="code-content">')

        html.append("<pre><code>")
        html.append(self._escape_html(self.code))
        html.append("</code></pre>")
        html.append("</div>")

        if self.line_numbers:
            html.append("</div>")

        html.append("</div>")
        return "".join(html)

    def _escape_html(self, text):
        """Escape HTML characters"""
        return (
            text.replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace('"', "&quot;")
            .replace("'", "&#x27;")
        )


class Alert(DisplayObject):
    """Display styled alert messages"""

    def __init__(self, message, alert_type="info", title=None, dismissible=False):
        self.message = message
        self.alert_type = alert_type  # info, success, warning, error
        self.title = title
        self.dismissible = dismissible

    def _repr_html_(self):
        classes = f"anode-alert alert-{self.alert_type}"
        if self.dismissible:
            classes += " alert-dismissible"

        html = [f'<div class="{classes}">']

        if self.title:
            html.append(f'<h4 class="alert-title">{self.title}</h4>')

        html.append(f'<div class="alert-message">{self.message}</div>')

        if self.dismissible:
            html.append(
                '<button class="alert-dismiss" onclick="this.parentElement.style.display=\'none\'">×</button>'
            )

        html.append("</div>")
        return "".join(html)


class Tabs(DisplayObject):
    """Display tabbed content"""

    def __init__(self, tabs_data, active_tab=0):
        """
        tabs_data: list of (title, content) tuples
        active_tab: index of initially active tab
        """
        self.tabs_data = tabs_data
        self.active_tab = active_tab

    def _repr_html_(self):
        tab_id = f"tabs-{id(self)}"

        html = [f'<div class="anode-tabs" id="{tab_id}">']

        # Tab headers
        html.append('<div class="tab-headers">')
        for i, (title, _) in enumerate(self.tabs_data):
            active_class = " active" if i == self.active_tab else ""
            html.append(
                f'<button class="tab-header{active_class}" onclick="showTab(\'{tab_id}\', {i})">{title}</button>'
            )
        html.append("</div>")

        # Tab content
        html.append('<div class="tab-contents">')
        for i, (_, content) in enumerate(self.tabs_data):
            active_style = "" if i == self.active_tab else " style='display: none;'"
            html.append(
                f'<div class="tab-content" id="{tab_id}-content-{i}"{active_style}>'
            )

            if hasattr(content, "_repr_html_"):
                html.append(content._repr_html_())
            elif hasattr(content, "__html__"):
                html.append(content.__html__())
            else:
                html.append(str(content))

            html.append("</div>")
        html.append("</div>")

        # JavaScript for tab switching
        html.append("""
        <script>
        function showTab(tabsId, index) {
            const tabsContainer = document.getElementById(tabsId);
            const headers = tabsContainer.querySelectorAll('.tab-header');
            const contents = tabsContainer.querySelectorAll('.tab-content');

            headers.forEach((h, i) => {
                h.classList.toggle('active', i === index);
            });

            contents.forEach((c, i) => {
                c.style.display = i === index ? 'block' : 'none';
            });
        }
        </script>
        """)

        html.append("</div>")
        return "".join(html)


def display_json(data, expanded=True, max_depth=3):
    """Display JSON data with syntax highlighting and collapsible tree"""
    json_str = json.dumps(data, indent=2, default=str)

    html = f"""
    <div class="anode-json-display" data-expanded="{str(expanded).lower()}" data-max-depth="{max_depth}">
        <pre class="json-content"><code class="language-json">{json_str}</code></pre>
    </div>
    """

    display(HTML(html))


def display_diff(old_text, new_text, title=None):
    """Display a diff between two text strings"""
    import difflib

    diff = difflib.unified_diff(
        old_text.splitlines(keepends=True),
        new_text.splitlines(keepends=True),
        fromfile="old",
        tofile="new",
    )

    diff_text = "".join(diff)

    html = ['<div class="anode-diff">']
    if title:
        html.append(f'<h4 class="diff-title">{title}</h4>')

    html.append('<pre class="diff-content">')
    for line in diff_text.split("\n"):
        css_class = ""
        if line.startswith("+"):
            css_class = "diff-added"
        elif line.startswith("-"):
            css_class = "diff-removed"
        elif line.startswith("@@"):
            css_class = "diff-header"

        html.append(f'<div class="{css_class}">{line}</div>')

    html.append("</pre></div>")

    display(HTML("".join(html)))


def display_image_grid(images, titles=None, max_width=200, columns=3):
    """Display a grid of images"""
    html = [
        f'<div class="anode-image-grid" style="display: grid; grid-template-columns: repeat({columns}, 1fr); gap: 10px;">'
    ]

    for i, img in enumerate(images):
        html.append('<div class="image-item">')

        if titles and i < len(titles):
            html.append(f'<h5 class="image-title">{titles[i]}</h5>')

        if hasattr(img, "_repr_png_"):
            img_data = img._repr_png_()
            if img_data:
                b64_data = base64.b64encode(img_data).decode()
                html.append(
                    f'<img src="data:image/png;base64,{b64_data}" style="max-width: {max_width}px;" />'
                )
        elif hasattr(img, "_repr_svg_"):
            svg_data = img._repr_svg_()
            if svg_data:
                html.append(f'<div style="max-width: {max_width}px;">{svg_data}</div>')
        else:
            html.append(f"<p>Unsupported image format: {type(img)}</p>")

        html.append("</div>")

    html.append("</div>")
    display(HTML("".join(html)))


def info(message, title="Info"):
    """Display an info alert"""
    display(Alert(message, "info", title))


def success(message, title="Success"):
    """Display a success alert"""
    display(Alert(message, "success", title))


def warning(message, title="Warning"):
    """Display a warning alert"""
    display(Alert(message, "warning", title))


def error(message, title="Error"):
    """Display an error alert"""
    display(Alert(message, "error", title))


# Convenience functions
def show_table(data, **kwargs):
    """Show a data table"""
    display(DataTable(data, **kwargs))


def show_code(code, language="python", **kwargs):
    """Show syntax-highlighted code"""
    display(CodeBlock(code, language, **kwargs))


def show_tabs(tabs_data, **kwargs):
    """Show tabbed content"""
    display(Tabs(tabs_data, **kwargs))


def show_progress(value, max_value=100, description=""):
    """Show a progress bar"""
    return Progress(value, max_value, description)


# Export main functions
__all__ = [
    "AnodeHTML",
    "AnodeMarkdown",
    "DataTable",
    "Progress",
    "CodeBlock",
    "Alert",
    "Tabs",
    "display_json",
    "display_diff",
    "display_image_grid",
    "info",
    "success",
    "warning",
    "error",
    "show_table",
    "show_code",
    "show_tabs",
    "show_progress",
]
