---
name: ebs-expert
description: >
  Oracle EBS domain expert for the oracle-gateway project. This skill should be used when
  querying EBS tables, calling PL/SQL APIs, writing to interface tables, or working with
  any EBS module (INV, BOM, WIP, LCM, PO, RCV, AP). Use when the user mentions oracle ebs,
  fnd_global, apps_initialize, interface table, pl/sql api, mtl_, bom_, wip_, po_, ap_,
  inl_, rcv_ table prefixes, ebs api, or any Oracle EBS module name. Covers APPS schema
  conventions, FND_GLOBAL initialization, multi-org setup, and the
  interface-table-then-API write pattern.
---

# Oracle EBS Expert

## The Mental Model

Oracle EBS has two key layers:

1. **The APPS layer** — synonyms and views pointing to native schema owners (INV, BOM, WIP,
   PO, AP, etc.). Always query via `APPS.*` in code; the DB resolves to the real owner. In
   `DBA_TAB_PRIVS`, OWNER shows the native schema (e.g. `INV`) even when granting on
   `APPS.MTL_SYSTEM_ITEMS_B`.

2. **The interface table pattern** — EBS never allows external systems to write directly to
   transactional tables. The flow is always:
   `INSERT into staging table → call PL/SQL API or submit concurrent program → EBS processes → check for errors`

## APPS Schema Convention

```ruby
# Oracle::Base sets this project-wide
self.table_name_prefix = "APPS."

# So this model queries APPS.MTL_SYSTEM_ITEMS_B
class Item < Oracle::Base
  self.table_name = "MTL_SYSTEM_ITEMS_B"
end
```

Table name suffixes in EBS:

| Suffix | Meaning |
|--------|---------|
| `_ALL` | Multi-org table (has `ORG_ID` column) |
| `_B` | Base table (translated via `_TL` sibling) |
| `_TL` | Translated/language table (join on `LANGUAGE = USERENV('LANG')`) |
| `_VL` | View combining `_B` + current language `_TL` |
| `_INTERFACE` / `_INT` | Staging table for API input |

## Multi-Org Setup (MO_GLOBAL)

Set the org context before querying `_ALL` tables — without it, every operating unit's rows
are returned:

```ruby
Oracle::Base.connection.execute(
  "BEGIN MO_GLOBAL.set_policy_context('S', :org_id); END;",
  org_id: 102  # OI_C01 CEDIS TIJUANA
)
```

Key organization IDs are in `docs/Organizaciones_ID.md`. Common ones: 102 (CEDIS Tijuana),
103 (CEDIS Hermosillo).

## EBS Session Initialization (FND_GLOBAL)

Call before any EBS PL/SQL API. Use the responsibility matching the target module:

```ruby
RESP = {
  inv: { resp_id: 50876, app_id: 401 },
  bom: { resp_id: 50858, app_id: 702 },
  wip: { resp_id: 20560, app_id: 706 },
  lcm: { resp_id: 50884, app_id: 9004 },
  po:  { resp_id: 50960, app_id: 201 },
  ap:  { resp_id: 50779, app_id: 200 },
}

def initialize_ebs_session(module_key)
  r = RESP[module_key]
  Oracle::Base.connection.execute(
    "BEGIN FND_GLOBAL.APPS_INITIALIZE(:user_id, :resp_id, :app_id); END;",
    user_id: 9297, resp_id: r[:resp_id], app_id: r[:app_id]
  )
end
```

`GATEWAY_SVC` user_id = **9297**.

## PL/SQL API Calling Pattern

Always check `x_return_status` after every API call:

```ruby
Oracle::Base.connection.execute(<<~SQL)
  DECLARE
    x_return_status VARCHAR2(1);
    x_msg_count     NUMBER;
    x_msg_data      VARCHAR2(2000);
  BEGIN
    SOME_PKG.SOME_API(
      p_api_version   => 1.0,
      p_init_msg_list => FND_API.G_TRUE,
      x_return_status => x_return_status,
      x_msg_count     => x_msg_count,
      x_msg_data      => x_msg_data
      -- ... other params
    );
    IF x_return_status != 'S' THEN
      RAISE_APPLICATION_ERROR(-20001, x_msg_data);
    END IF;
  END;
SQL
```

`x_return_status` values: `'S'` = success, `'E'` = error, `'U'` = unexpected error.

## Interface Table Write Pattern

```ruby
# 1. INSERT into staging
Oracle::Base.connection.execute(<<~SQL)
  INSERT INTO APPS.AP_INVOICES_INTERFACE (
    INVOICE_ID, INVOICE_NUM, VENDOR_ID, ...
  ) VALUES (
    AP_INVOICES_INTERFACE_S.NEXTVAL, 'INV-001', 12345, ...
  )
SQL

# 2. Call import API to process staging data
Oracle::Base.connection.execute(<<~SQL)
  BEGIN
    AP_IMPORT_INVOICES_PKG.IMPORT_INVOICES(
      p_batch_id    => NULL,
      p_commit_size => 100
    );
  END;
SQL

# 3. Check for errors — rejected rows remain in staging with STATUS = 'REJECTED'
```

## Effective Dating

Many EBS tables have effective date ranges. Always filter:

```ruby
scope :effective_today, -> {
  where("EFFECTIVE_START_DATE <= SYSDATE")
    .where("EFFECTIVE_END_DATE IS NULL OR EFFECTIVE_END_DATE >= SYSDATE")
}
```

## Lookups

EBS uses centralized lookups instead of enums:

```ruby
Oracle::Base.connection.execute(
  "SELECT LOOKUP_CODE, MEANING FROM APPS.FND_LOOKUPS WHERE LOOKUP_TYPE = :type",
  type: 'DOCUMENT TYPE'
)
```

## Module Reference

For key read tables, interface tables, and write APIs per module (INV, BOM, WIP, LCM, PO,
RCV, AP), see **`references/modules.md`**.
