# Pyodide Introduction

Pyodide allows you to run Python code in a JavaScript runtime environment. To understand how this works, let's review how the CPython program typically operates. CPython's source code, written in C, is compiled into assembly (x86-64 or arm64) targeting a specific operating system (Linux, macOS, etc.), producing the final `python` binary. When you run `python script.py`, these assembly instructions parse and execute the script, providing a runtime that implements functions like `os.open` and other APIs.

For Pyodide, the process begins similarly with the CPython C source code. However, instead of targeting a specific assembly and operating system, Pyodide targets WebAssembly as the compilation target. This resulting binary cannot execute independently; it requires an engine (like a web browser or Deno) capable of executing WebAssembly. Once loaded, Python can then parse and execute a `.py` file in a manner similar to standard Python.

The net result is that a browser can load Pyodide, and then parse and handle a `.py` file in a similar manner as normal Python.

Beyond this introduction, Pyodide offers additional advantages (JavaScript interaction) and has certain disadvantages (package availability, system interactions) that will be covered later.

## LLVM, Emscripten, and WASI

Generating WebAssembly involves several layers of complexity. For a more detailed description, refer to the [WASI overview](https://hacks.mozilla.org/2019/03/standardizing-wasi-a-webassembly-system-interface/) and Cloudflare's [Python Worker post](https://blog.cloudflare.com/python-workers/).

The compilation process begins with a standardized approach. Starting with the C source code, the LLVM ecosystem is used for compilation. LLVM provides various frontends (like Clang for C), a standardized intermediate format (LLVM IR), and backends to produce target code. If CPython is already built using LLVM, the initial step is already complete.

Emscripten is a backend that takes LLVM IR and generates WebAssembly. Additionally, Emscripten includes its own libc implementation, which redirects some system calls to JavaScript for integration with browser APIs.

This approach leads to a non-portable mechanism where the compiled program is tightly coupled to how system calls are expected to function. While WASI was designed to standardize this, Pyodide does not currently utilize it.

## JavaScript Glue

Python has always supported interaction with other languages, enabling calls to C code from Python, for example. Pyodide's implementation also generates modules that interact with the browser, made accessible to Python code via the [FFI](https://pyodide.org/en/stable/usage/api/python-api/ffi.html#module-pyodide.ffi). This bridge facilitates bidirectional communication, allowing Python code to interact with JavaScript and vice versa.

Different environments expose these wrappers uniquely. For instance, PyScript uses `from pyscript import window, document`, while Cloudflare Workers use `from js import document`. All these implementations are built upon Pyodide's core capabilities.

## Python Package Availability

Python packages can contain compiled code. These packages face similar challenges and will not function in WebAssembly without cross-compilation. Consequently, Pyodide maintains a specific list of cross-compiled packages. This step is unnecessary for pure Python packages available via wheel files.

## System Compatibility

Beyond cross-compilation, the underlying environments differ significantly. Cloudflare's blog provides more details, but aspects like async programming models, raw socket access, and filesystems vary between browser environments and native machines. This explains why some packages are unavailable or require [source code modifications](https://github.com/cloudflare/pyodide/blob/main/packages/httpx/httpx_patch.py) to adapt them for browser environments, irrespective of WebAssembly.

## Browsers, Deno, and Workers

Pyodide itself provides the mechanism to cross-compile Python and other packages; it does not execute the code directly. That's where a runtime comes in. For PyScript, the browser acts as the runtime. For Cloudflare, it's their worker system. For Anode, it involves loading Pyodide in Deno.

## Learn More

For more details, refer to:

- [WASI overview](https://hacks.mozilla.org/2019/03/standardizing-wasi-a-webassembly-system-interface/)
- [Cloudflare's Python Worker post](https://blog.cloudflare.com/python-workers/)
- [Urllib3 and WebAssembly](https://urllib3.readthedocs.io/en/stable/reference/contrib/emscripten.html)
- [Pyscript Introduction](https://www.anaconda.com/blog/pyscript-python-in-the-browser)
