# Oracle SQL Dialect Reference

## PostgreSQL → Oracle Translation Table

| PostgreSQL | Oracle | Notes |
|-----------|--------|-------|
| `LIMIT 10` | `WHERE ROWNUM <= 10` or `FETCH FIRST 10 ROWS ONLY` | ROWNUM is evaluated before ORDER BY — wrap in subquery if ordering matters |
| `OFFSET 20 LIMIT 10` | Subquery with `ROWNUM` or cursor-based | See pagination section below |
| `TRUE` / `FALSE` | `'Y'` / `'N'` | EBS uses VARCHAR2 flags, not booleans |
| `NOW()` | `SYSDATE` | Oracle SYSDATE includes time |
| `CURRENT_DATE` | `TRUNC(SYSDATE)` | Strips time component |
| `ILIKE '%val%'` | `UPPER(col) LIKE UPPER('%val%')` | Oracle has no ILIKE |
| `\|\|` (concat) | `\|\|` (same) | Both use double-pipe |
| `SERIAL` / auto-increment | `SEQUENCE_NAME.NEXTVAL` | Must reference sequence explicitly |
| `BOOLEAN` type | `NUMBER(1)` or `VARCHAR2(1)` | No native boolean in Oracle |
| `''` (empty string) | `NULL` | Oracle treats empty string as NULL |
| `COALESCE(col, '')` | `NVL(col, '')` or `COALESCE(col, '')` | NVL is Oracle-native, COALESCE also works |
| `EXTRACT(YEAR FROM col)` | `EXTRACT(YEAR FROM col)` | Same syntax |
| `TO_DATE('2026-01-01')` | `TO_DATE('2026-01-01', 'YYYY-MM-DD')` | Oracle requires format mask |
| `ARRAY_AGG` | `LISTAGG(col, ',') WITHIN GROUP (ORDER BY col)` | Different aggregate function |
| `string_agg` | `LISTAGG` | Same |
| `NULLIF(a, b)` | `NULLIF(a, b)` | Same |
| `CAST(x AS TEXT)` | `TO_CHAR(x)` | Use TO_CHAR for number/date to string |
| `CAST(x AS INTEGER)` | `TO_NUMBER(x)` | Use TO_NUMBER for string to number |

## Pagination

### Cursor-Based (Preferred)

Use `INVENTORY_ITEM_ID > :cursor` pattern — efficient because it uses an index:

```sql
SELECT *
FROM APPS.MTL_SYSTEM_ITEMS_B
WHERE ORGANIZATION_ID = :org_id
  AND INVENTORY_ITEM_ID > :cursor
ORDER BY INVENTORY_ITEM_ID
FETCH FIRST 100 ROWS ONLY
```

In Ruby:

```ruby
def fetch_page(org_id:, cursor: 0, page_size: 100)
  Oracle::Base.connection.execute(<<~SQL, org_id: org_id, cursor: cursor, size: page_size)
    SELECT INVENTORY_ITEM_ID, SEGMENT1, DESCRIPTION
    FROM APPS.MTL_SYSTEM_ITEMS_B
    WHERE ORGANIZATION_ID = :org_id
      AND INVENTORY_ITEM_ID > :cursor
    ORDER BY INVENTORY_ITEM_ID
    FETCH FIRST :size ROWS ONLY
  SQL
end
```

### Offset-Based (When Required)

Wrap in a subquery — `ROWNUM` is assigned before `ORDER BY`:

```sql
-- WRONG: ROWNUM applied before ORDER BY
SELECT * FROM APPS.MTL_SYSTEM_ITEMS_B WHERE ROWNUM <= 10 ORDER BY SEGMENT1

-- CORRECT: order in subquery, then limit in outer query
SELECT * FROM (
  SELECT INVENTORY_ITEM_ID, SEGMENT1, DESCRIPTION,
         ROW_NUMBER() OVER (ORDER BY SEGMENT1) AS RN
  FROM APPS.MTL_SYSTEM_ITEMS_B
  WHERE ORGANIZATION_ID = :org_id
) WHERE RN BETWEEN :offset + 1 AND :offset + :limit
```

## Date Handling

```sql
-- Today's date (no time)
TRUNC(SYSDATE)

-- Specific date
TO_DATE('2026-01-15', 'YYYY-MM-DD')

-- Date arithmetic (add 30 days)
SYSDATE + 30

-- Date arithmetic (add 1 month)
ADD_MONTHS(SYSDATE, 1)

-- Date difference in days
TRUNC(SYSDATE) - TRUNC(creation_date)

-- Format date as string
TO_CHAR(creation_date, 'YYYY-MM-DD HH24:MI:SS')
```

## String Functions

```sql
-- Substring
SUBSTR(string, start_position, length)  -- 1-indexed, not 0-indexed

-- String length
LENGTH(string)

-- Trim
TRIM(string)
LTRIM(string)
RTRIM(string)

-- Replace
REPLACE(string, search, replacement)

-- Upper/Lower
UPPER(string)
LOWER(string)

-- Pad
LPAD(string, length, pad_char)
RPAD(string, length, pad_char)
```

## NULL Handling

Oracle treats empty string `''` as NULL — this differs from PostgreSQL:

```ruby
# This stores NULL, not ''
Oracle::Base.connection.execute(
  "UPDATE APPS.SOME_TABLE SET NOTES = :notes WHERE ID = :id",
  notes: '', id: 1
)

# Check for empty/null safely
where("NOTES IS NULL OR TRIM(NOTES) = ' '")
```

## Sequences

EBS uses named sequences for primary key generation:

```ruby
# Get next value from a sequence
result = Oracle::Base.connection.execute(
  "SELECT AP_INVOICES_INTERFACE_S.NEXTVAL FROM DUAL"
)
next_id = result.first['NEXTVAL']

# Or use directly in INSERT
Oracle::Base.connection.execute(<<~SQL)
  INSERT INTO APPS.AP_INVOICES_INTERFACE (INVOICE_ID, ...)
  VALUES (AP_INVOICES_INTERFACE_S.NEXTVAL, ...)
SQL
```
