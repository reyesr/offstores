OffStores
=========

An offline data store library for browser-side javascript.

Offstores manages a key/object data storage, built on the HTML5 storage when available.
It manages several backends, and can automatically select the most suitable one depending on the HTML5 features available on the browser.

Features:
- Support for IndexedDB, WebSQL, LocalStorage, and Memory-based backends
- Same semantic on all the backends, including transactions.
- Automatically finds most-suitable backend, with possible customizations.
- Supports bulk operations for performance
- High-level API to easily access a store
- Low-level API to manage transactions at the application level
- Extensively unit-tested
