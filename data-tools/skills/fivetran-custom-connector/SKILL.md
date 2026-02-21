---
name: fivetran-custom-connector
description: Use when working on the GEOTAB, WMS, or FOCALTEC Fivetran custom SDK connectors — adding a new entity/table to afalConfiguration.py, debugging a sync that skips records or truncates pages, fixing null values cast to 0 or empty string, resolving schema corruption from getschemas mutation, writing incremental or offset-based sync strategies, configuring credentials in configuration.json, or writing tests using the load_connector fixture pattern.
---

# Fivetran Custom SDK Connector

## Overview

Two-file architecture: `connector.py` (sync engine) + `afalConfiguration.py` (entity definitions). The SDK requires exactly two functions wired into a `Connector` instance. **Three connectors exist with distinct architectures** — FOCALTEC (REST/requests), WMS (REST/requests), GEOTAB (mygeotab SDK).

## Required Functions

```python
from fivetran_connector_sdk import Connector, Logging as log, Operations as op

def schema(configuration: dict):
    # Returns list of table dicts — must be clean, no routing keys
    ...

def update(configuration: dict, state: dict):
    # Generator — yield op.upsert() and op.checkpoint()
    ...

connector = Connector(update=update, schema=schema)
```

**`schema()` is called by Fivetran BEFORE `update()`** — never mutate the `entity["schema"]` dicts that `schema()` returns, or subsequent SDK calls receive corrupted schemas.

## Connector Differences

| | FOCALTEC | WMS | GEOTAB |
|---|---|---|---|
| Entity module key | `focaltecEntityModule` | `oracleEntityModule` | `geotabEntityModule` |
| HTTP client | `requests` + Session | `requests` | `mygeotab` SDK |
| Auth | `pdp_key`/`pdp_secret` from `configuration` | HTTPBasicAuth hardcoded in afalConfiguration | Credentials in afalConfiguration |
| Null handling | `None` (fixed) | `0`/`""` (legacy) | `0`/`""` (legacy) |
| Schema mutation in getschemas | Fixed (dict spread) | Still mutates | Still mutates |
| Incremental state key | `last_sync_tablename` | `last_sync_tablename` | `last_sync_offset_tablename` |
| Pagination | offset-based | offset-based | Geotab Get API with sort/offset |

WMS and GEOTAB null-handling and schema mutation are known technical debt — only FOCALTEC has been refactored.

## afalConfiguration.py Structure

```python
afalconfiguration = {
    "focaltecEntityModule": {          # WMS: "oracleEntityModule", GEOTAB: "geotabEntityModule"
        "baseUrl": "https://api.example.com",
        "pageSize": 50,
        # NO credentials here (FOCALTEC) — read from configuration dict at runtime
        "entities": [
            {
                "name": "invoices",
                "endpoint": "invoices",
                "pagination_type": "offset",   # "offset" or "none" — NEVER "none" on paginated endpoints
                "incremental_filter": "from",  # "" = full reload only
                "date_format": "date",         # "date" = YYYY-MM-DD, "" = ISO datetime
                "schema": {
                    "table": "invoices",
                    "primary_key": ["id"],
                    "columns": { ... }
                }
            }
        ]
    }
}
```

## Column Naming Convention

| Key pattern | Maps to | Example |
|-------------|---------|---------|
| `field` | `item["field"]` | `"id": "STRING"` |
| `parent__child` | `item["parent"]["child"]` | `"cfdi__total": "DOUBLE"` |
| `parent___child` (GEOTAB only) | `item["parent"][0]["child"]` | `"groups___id": "STRING"` |

**Types (all 14):** `STRING`, `INT`, `DOUBLE`, `BOOLEAN`, `UTC_DATETIME`, `NAIVE_DATETIME`, `NAIVE_DATE`, `SHORT`, `LONG`, `FLOAT`, `DECIMAL`, `BINARY`, `XML`, `JSON`

In practice the connectors use only `STRING`, `INT`, `DOUBLE`, `BOOLEAN`, `UTC_DATETIME`. Use `NAIVE_DATETIME`/`NAIVE_DATE` for timestamps without timezone info.

## Critical Patterns

### _cast — Always return None for null inputs (FOCALTEC)

```python
def _cast(val, col_type):
    if val is None:
        return None   # NOT 0, NOT 0.0, NOT ""
    if col_type == "INT":
        return int(val)
    if col_type == "DOUBLE":
        return float(val)
    return val
```

`NULL` in the warehouse means "unknown". Replacing it with `0` or `""` corrupts analytics. WMS and GEOTAB still use the legacy zero-default pattern (known debt).

### getschemas — Never mutate entity["schema"] (fixed in FOCALTEC only)

```python
# ❌ WRONG — mutates the shared dict (still present in WMS and GEOTAB)
entity["schema"]["pagination_type"] = entity["pagination_type"]
schemas.append(entity["schema"])

# ✅ CORRECT — dict spread creates a new dict (FOCALTEC)
schema_entry = {
    **entity["schema"],
    "pagination_type": entity["pagination_type"],
    "incremental_filter": entity["incremental_filter"],
    "endpoint": entity["endpoint"],
}
schemas.append(schema_entry)
```

### extract_items — Guard non-dict responses

```python
def extract_items(response):
    if isinstance(response, list):
        return response
    if not isinstance(response, dict):
        return []   # handles None, strings, error envelopes
    for key in ("data", "results", "items", "records"):
        if isinstance(response.get(key), list):
            return response[key]
    return []
```

### schema() — Always use .get() with default for skipentities

```python
# ✅ CORRECT — safe default prevents AttributeError when key is absent
if configuration.get("skipentities", "").count("[" + entity["schema"]["table"] + "]") == 0:
    schemas.append(entity["schema"])

# ❌ WRONG — raises AttributeError if skipentities is missing (bug in WMS/GEOTAB)
if configuration.get("skipentities").count(...):
```

### HTTP — Session + retry + raise_for_status (FOCALTEC/WMS)

```python
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

def _make_session():
    session = rq.Session()
    retry = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retry)
    session.mount("https://", adapter)
    session.mount("http://", adapter)
    return session

_session = _make_session()
```

**Always call `res.raise_for_status()` after every `.get()`.** Without it, API error envelopes parse silently, the cursor advances, and a page window is permanently lost.

### Credentials — Read from configuration dict (FOCALTEC pattern)

```python
# FOCALTEC — credentials from configuration.json at runtime
def _auth_headers(configuration):
    return {
        "PDPTenantKey": configuration["pdp_key"],
        "PDPTenantSecret": configuration["pdp_secret"],
        "Content-Type": "application/json",
    }
```

`configuration.json` fields: `pdp_key`, `pdp_secret`, `tenant_id` (empty strings in repo). WMS uses `rq.auth.HTTPBasicAuth` hardcoded in afalConfiguration — that is the legacy pattern.

## Sync Strategies

### Offset pagination (FOCALTEC/WMS)

```python
offset = 0
while True:
    params = {"pageSize": page_size, "offset": offset}
    res = _session.get(url, headers=_auth_headers(configuration), params=params)
    res.raise_for_status()
    items = extract_items(res.json())
    if not items:
        break
    for item in items:
        yield op.upsert(table=tablename, data=item_map(tableschema, item))
    yield op.checkpoint(state)              # checkpoint after EACH page
    has_more, offset = should_continue_pagination(offset, page_size, items)
    if not has_more:
        break
```

Use the shared `should_continue_pagination()` helper — do not inline the break logic.

**Checkpoint rate limit:** Fivetran degrades performance if you checkpoint more than once per minute. With small page sizes on fast APIs, add a time guard or increase `pageSize` so each page takes at least ~60 seconds to process.

### Incremental (date-range filter) — `until_map` is required

```python
# Subtract 1 hour lookback to catch late-arriving records
from_dt = arrow.get(last_sync).datetime - datetime.timedelta(hours=1)

# Map filter param → its corresponding "until" param
until_map = {"createdFrom": "createdUntil", "from": "to"}
filter_params = {incremental_filter: from_ts_adjusted}
if incremental_filter in until_map:
    filter_params[until_map[incremental_filter]] = to_ts_formatted
```

**When adding a new incremental entity** with a `to`/`until` boundary param, add its `filter_name → until_name` pair to `until_map`. Omitting it produces open-ended queries that pull all records on every incremental run.

Use `date_format="date"` for APIs that take `YYYY-MM-DD`; omit for full ISO 8601.

### GEOTAB pagination (mygeotab SDK — distinct from REST connectors)

```python
import mygeotab
# GEOTAB uses the vendor SDK, not requests
api = mygeotab.API(username, password, database)
results = api.get("Device", search={"fromDate": ...}, resultsLimit=page_size)
# Uses sort + offset params; GetCountOf determines total for simulation
# DatetimeEncoder required for datetime serialization
# State key: last_sync_offset_tablename (not last_sync_tablename)
```

### Full list (small reference tables)

Set `pagination_type: "offset"` even for single-page endpoints — `"none"` is reserved for non-paginated list APIs and routes to `sync_full_list()`, which issues one GET with no pagination params.

## State Management

**State constraints (enforced by Fivetran):**
- Maximum size: 10MB — never buffer large data objects in state
- Never store credentials or API keys in state — use `configuration` dict instead
- Failed syncs without a checkpoint restart from the previous completed sync's starting point

```python
# FOCALTEC/WMS state key
state["last_sync_tablename"] = to_ts          # ISO timestamp

# GEOTAB state key (offset cursor, not timestamp)
state["last_sync_offset_tablename"] = last_id

# forceCompleteLoad resets incremental — re-syncs all data
force_complete = configuration.get("forceCompleteLoad") == "true"
is_incremental = last_sync is not None and incremental_filter != "" and not force_complete
```

## configuration.json Fields

| Field | Description |
|-------|-------------|
| `sentry-dsn` | Error monitoring DSN |
| `skipentities` | `"[Table1][Table2]"` — skip these tables |
| `forceCompleteLoad` | `"true"` to reset and re-sync all data |
| `pdp_key` / `pdp_secret` / `tenant_id` | FOCALTEC runtime credentials (empty strings in repo) |

## Testing

**Required: mock external SDKs before any connector import** — they are imported at module level.

```python
# conftest.py — must run before any connector import
import sys
from unittest.mock import MagicMock

for _mod in ["fivetran_connector_sdk", "sentry_sdk", "mygeotab"]:
    sys.modules.setdefault(_mod, MagicMock())

def load_connector(connector_name):
    sys.modules.pop("afalConfiguration", None)     # isolate each connector's config
    sys.path.insert(0, os.path.join(ROOT, connector_name))
    try:
        spec = importlib.util.spec_from_file_location(f"{connector_name}_connector", ...)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        sys.path.pop(0)
```

```python
# Usage in test files
from tests.conftest import load_connector

@pytest.fixture(scope="module")
def focaltec():
    return load_connector("FOCALTEC")

def test_cast_null(focaltec):
    assert focaltec._cast(None, "DOUBLE") is None

# Mock _session to test HTTP behavior
def test_incremental(focaltec):
    focaltec._session.get = MagicMock(return_value=mock_empty_response())
    list(focaltec.sync_items_incremental(...))
    call_params = focaltec._session.get.call_args[1]["params"]
    assert "T" not in call_params["from"]   # date format verified

# Access afalConfiguration through the loaded module
entities = focaltec.afalConfiguration.afalconfiguration
```

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| `_cast(None, "DOUBLE") → 0.0` | Return `None` for null inputs (WMS/GEOTAB still have this bug) |
| Mutating `entity["schema"]` in `getschemas` | Use dict spread `{**entity["schema"], ...}` (WMS/GEOTAB still have this bug) |
| Missing `res.raise_for_status()` | Add after every `.get()` call |
| Credentials hardcoded in afalConfiguration | Read from `configuration` dict (FOCALTEC pattern; WMS/GEOTAB use legacy pattern) |
| `pagination_type: "none"` on paginated endpoint | Use `"offset"` — `"none"` routes to `sync_full_list()` with no pagination |
| `timedelta(days=1)` lookback | Use `timedelta(hours=1)` — 1 day causes redundant upserts |
| Monetary amounts typed as BOOLEAN | Use `DOUBLE` for amounts, `BOOLEAN` only for flags |
| Inline pagination break logic | Use `should_continue_pagination(offset, page_size, items)` helper |
| New incremental entity missing from `until_map` | Add `{filter_param: until_param}` pair to `until_map` in `sync_items_incremental` |
| Missing `.get("skipentities", "")` default | Use `.get(..., "")` — `.get(...)` alone raises AttributeError when key absent |
| Forgetting SDK mocks in tests | Mock `fivetran_connector_sdk`, `sentry_sdk`, `mygeotab` via `sys.modules.setdefault` before import |

## Python Version

`fivetran_connector_sdk` supports **Python 3.10–3.14**. `requirements.txt` = production deps sent to Fivetran; `pythonrequirements.txt` = full local dev deps including the SDK.

## Local End-to-End Testing

Unit tests (pytest) verify logic in isolation. Always also run the connector end-to-end with real source data before deploying:

```bash
# From inside the connector directory (e.g., FOCALTEC/)
fivetran debug --configuration ./configuration.json
```

`fivetran debug` emulates Fivetran's core sync loop locally, calling `schema()` then `update()` against the real API. Pytest unit tests cannot replace this — they mock the HTTP layer and never exercise actual API behavior.
