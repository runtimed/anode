"""
Bootstrap utilities for Runt Runtime

This module provides utilities for bootstrapping the Python environment
with necessary packages, particularly for micropip package installation
and environment setup.
"""

import micropip


# Package loading state tracking
_critical_packages_loaded = False
_background_loading_started = False
_loaded_packages = set()


def _configure_matplotlib_backend():
    """Configure matplotlib backend early to prevent WebWorker DOM issues"""
    try:
        import os

        # Set environment variable to prevent auto-detection
        os.environ["MPLBACKEND"] = "Agg"
        print("Matplotlib backend environment set: Agg")
    except Exception as e:
        print(f"Warning: Failed to configure matplotlib backend: {e}")


async def bootstrap_micropip_packages():
    """Bootstrap essential micropip packages for the runtime environment

    Note: this _must_ be run on start of this ipython session
    """
    global _critical_packages_loaded, _background_loading_started

    # Configure matplotlib backend before loading any packages
    _configure_matplotlib_backend()

    # Critical packages that must be available before user code runs
    critical_packages = [
        "pydantic",  # Required for function registry system
        "pandas",  # Most commonly used data analysis package
        "numpy",  # Fundamental numerical computing
        "matplotlib",  # Required for pandas plotting and general plotting
    ]

    # Load critical packages synchronously
    print("Loading critical packages synchronously...")
    failed_critical = []

    for package in critical_packages:
        try:
            await micropip.install(package)
            _loaded_packages.add(package)
        except Exception as e:
            failed_critical.append(package)
            print(f"Warning: Failed to install critical package {package}: {e}")

    _critical_packages_loaded = True

    if failed_critical:
        print(f"Warning: Critical packages failed to install: {failed_critical}")

    # Start background loading of additional packages
    await _start_background_package_loading()


async def _start_background_package_loading():
    """Start loading additional packages in the background"""
    global _background_loading_started

    if _background_loading_started:
        return

    _background_loading_started = True

    # Additional packages to load in background
    background_packages = [
        "seaborn",  # Statistical plotting
        "requests",  # HTTP requests
        "scipy",  # Scientific computing
        "sympy",  # Symbolic mathematics
        "scikit-learn",  # Machine learning
        "beautifulsoup4",  # HTML parsing
        "pillow",  # Image processing
    ]

    # Background installation with minimal output

    # Use asyncio to load packages concurrently in background
    import asyncio

    async def load_package_background(package):
        try:
            await micropip.install(package)
            _loaded_packages.add(package)
        except Exception as e:
            # Continue silently for background packages
            pass

    # Fire and forget - don't wait for completion
    for package in background_packages:
        asyncio.create_task(load_package_background(package))


def is_package_loaded(package_name: str) -> bool:
    """Check if a specific package has been loaded"""
    return package_name in _loaded_packages


def are_critical_packages_loaded() -> bool:
    """Check if critical packages have been loaded"""
    return _critical_packages_loaded


async def wait_for_package(package_name: str, timeout_seconds: int = 30) -> bool:
    """Wait for a specific package to be available, with timeout

    Args:
        package_name: Name of the package to wait for
        timeout_seconds: Maximum time to wait

    Returns:
        True if package is available, False if timeout
    """
    import asyncio

    # Check if already loaded
    if is_package_loaded(package_name):
        return True

    # Try to load the package if not already loaded
    if package_name not in _loaded_packages:
        try:
            await micropip.install(package_name)
            _loaded_packages.add(package_name)
            return True
        except Exception as e:
            return False

    # Wait for background loading with timeout
    for _ in range(timeout_seconds * 10):  # Check every 100ms
        if is_package_loaded(package_name):
            return True
        await asyncio.sleep(0.1)

    # Silent timeout - package may still be loading in background
    return False


def get_package_loading_status():
    """Get current package loading status for debugging"""
    return {
        "critical_packages_loaded": _critical_packages_loaded,
        "background_loading_started": _background_loading_started,
        "loaded_packages": list(_loaded_packages),
        "total_loaded": len(_loaded_packages),
    }


async def install_package(package_name: str, fallback_to_micropip: bool = True):
    """Install a single package, with optional micropip fallback

    Args:
        package_name: Name of the package to install
        fallback_to_micropip: Whether to try micropip if pyodide.loadPackage fails
    """
    try:
        # First try to load via Pyodide's package system
        import js

        pyodide = js.pyodide

        try:
            await pyodide.loadPackage(package_name)
            print(f"Loaded {package_name} via Pyodide package system")
            return True
        except Exception as pyodide_error:
            if fallback_to_micropip:
                print(
                    f"Pyodide package load failed for {package_name}: {pyodide_error}"
                )
                print(f"Trying micropip for {package_name}...")
                await micropip.install(package_name)
                print(f"Installed {package_name} via micropip")
                return True
            else:
                raise pyodide_error

    except Exception as e:
        print(f"Failed to install {package_name}: {e}")
        return False


async def install_packages(package_names: list, fail_fast: bool = False):
    """Install multiple packages

    Args:
        package_names: List of package names to install
        fail_fast: Whether to stop on first failure or continue with remaining packages
    """
    results = {}

    for package_name in package_names:
        try:
            success = await install_package(package_name)
            results[package_name] = success
            if not success and fail_fast:
                break
        except Exception as e:
            results[package_name] = False
            print(f"Error installing {package_name}: {e}")
            if fail_fast:
                break

    return results


def get_installed_packages():
    """Get information about currently installed packages"""
    try:
        import js

        pyodide = js.pyodide

        # Get packages loaded via Pyodide
        loaded_packages = pyodide.loadedPackages.to_py()

        # Get packages installed via micropip
        micropip_packages = {}
        try:
            import importlib.metadata

            for dist in importlib.metadata.distributions():
                micropip_packages[dist.metadata["Name"]] = dist.version
        except Exception as e:
            print(f"Could not get micropip package info: {e}")

        return {
            "pyodide_packages": loaded_packages,
            "micropip_packages": micropip_packages,
        }

    except Exception as e:
        print(f"Error getting package information: {e}")
        return {}


def print_package_info():
    """Print information about installed packages"""
    info = get_installed_packages()

    print("=== Package Information ===")

    if info.get("pyodide_packages"):
        print(f"\nPyodide Packages ({len(info['pyodide_packages'])}):")
        for name, source in info["pyodide_packages"].items():
            print(f"  {name}: {source}")

    if info.get("micropip_packages"):
        print(f"\nMicropip Packages ({len(info['micropip_packages'])}):")
        for name, version in info["micropip_packages"].items():
            print(f"  {name}: {version}")

    print("=" * 30)
