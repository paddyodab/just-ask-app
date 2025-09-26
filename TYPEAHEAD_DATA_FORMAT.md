# Typeahead Data Format Guide

## Overview
This guide explains how to structure CSV data for typeahead functionality in the Just Ask platform. The data format follows the same pattern used throughout the system, making it seamless to enable typeahead on any lookup dataset.

## CSV Format Requirements

### Required Columns
Every CSV must have these two columns:
- `key`: The unique identifier (used for form values and filtering)
- `value`: The stored value (usually same as key or a code)

### Standard Optional Columns
- `text`: The display text shown to users (if not provided, defaults to `value`)

### Relationship Columns
For hierarchical/cascading dropdowns:
- Parent reference column (e.g., `country`, `continent`, `parent_key`)

### Metadata Columns
Any additional columns become searchable/filterable fields:
- Categories (e.g., `spot_type`, `cuisine`, `department`)
- Attributes (e.g., `price_range`, `best_season`, `population`)

## Example Data Structures

### 1. Simple List (No Relationships)
**File:** `vacation_budget_ranges.csv`
```csv
key,value,text
budget,budget,Budget ($500-$1500)
moderate,moderate,Moderate ($1500-$3500)
expensive,expensive,Premium ($3500-$7000)
luxury,luxury,Luxury ($7000+)
```

**Typeahead behavior:**
- User types "bud" → shows "Budget ($500-$1500)"
- User types "lux" → shows "Luxury ($7000+)"

### 2. Hierarchical Data (Parent-Child)
**File:** `countries.csv`
```csv
key,value,text,continent
usa,usa,United States,north-america
canada,canada,Canada,north-america
mexico,mexico,Mexico,north-america
italy,italy,Italy,europe
france,france,France,europe
japan,japan,Japan,asia
```

**File:** `vacation-spots.csv`
```csv
key,value,text,country,spot_type,best_season
miami,miami,Miami Beach,usa,beach,winter
paris,paris,Paris,france,city,spring
tokyo,tokyo,Tokyo,japan,city,spring
```

**Typeahead behavior:**
- Countries: User types "uni" → shows "United States"
- Spots (filtered by country): After selecting USA, typing "mia" → shows "Miami Beach"

### 3. Large Datasets for Typeahead

**File:** `airports.csv`
```csv
key,value,text,city,country,iata_code
jfk,jfk,John F. Kennedy International (JFK),new-york,usa,JFK
lax,lax,Los Angeles International (LAX),los-angeles,usa,LAX
cdg,cdg,Charles de Gaulle (CDG),paris,france,CDG
nrt,nrt,Narita International (NRT),tokyo,japan,NRT
```

**Typeahead features:**
- Search by airport name: "kenn" → "John F. Kennedy International (JFK)"
- Search by code: "JFK" → "John F. Kennedy International (JFK)"
- Search by city: "paris" → "Charles de Gaulle (CDG)"

## Data Preparation Guidelines

### 1. Key Format
- Use lowercase, hyphenated format: `new-york`, `los-angeles`
- No spaces or special characters
- Keep consistent across related datasets

### 2. Text Format
- Use proper capitalization for display
- Include helpful context in parentheses if needed
- Keep concise for dropdown display

### 3. Relationship Fields
- Use exact key values from parent datasets
- Maintain referential integrity
- Test cascading relationships

### 4. File Size Considerations

For optimal typeahead performance:
- **< 1,000 rows**: No special considerations needed
- **1,000-10,000 rows**: Ensure good search terms in text field
- **> 10,000 rows**: Consider splitting by category or region

## Upload Process

### 1. Via API Endpoint
```bash
POST /api/v1/operations/customers/{customer_hex}/namespaces/{namespace_slug}/lookups/upload-csv

Form Data:
- lookup_name: "countries"  # Name for this lookup set
- lookup_type: "list"       # Usually "list"
- file: countries.csv       # The CSV file
```

### 2. CSV Validation
The backend will:
- Check for required `key` and `value` columns
- Strip whitespace and quotes
- Store additional columns as metadata
- Create the JSON structure automatically

### 3. Data Structure in Database
Your CSV:
```csv
key,value,text,continent
usa,usa,United States,north-america
```

Becomes:
```json
{
  "key": "usa",
  "value": {
    "value": "usa",
    "text": "United States",
    "continent": "north-america"
  }
}
```

## Enabling Typeahead in Surveys

Once data is uploaded, enable typeahead in your survey JSON:

```json
{
  "type": "dropdown",
  "name": "country",
  "title": "Select your country",
  "enableTypeahead": true,
  "typeaheadMinLength": 2,
  "typeaheadDebounceMs": 300,
  "choicesByUrl": {
    "url": "/api/v1/lookups/countries",
    "valueName": "key",
    "titleName": "text"
  }
}
```

## Cascading Typeahead

For dependent dropdowns with typeahead:

```json
{
  "type": "dropdown",
  "name": "vacation_spot",
  "title": "Select destination",
  "enableTypeahead": true,
  "choicesByUrl": {
    "url": "/api/v1/lookups/vacation-spots?country={country}",
    "valueName": "key",
    "titleName": "text"
  },
  "visibleIf": "{country} notempty"
}
```

## Search Behavior

The typeahead search works on multiple fields:
1. **key**: The identifier
2. **text**: The display text  
3. **value**: The stored value
4. Any additional columns in your CSV

Example: For an airport with:
- key: "jfk"
- text: "John F. Kennedy International (JFK)"
- city: "new-york"
- iata_code: "JFK"

Users can find it by typing:
- "jfk" (matches key and iata_code)
- "john" or "kenn" (matches text)
- "new" (matches city)

## Best Practices

### 1. Text Optimization for Search
```csv
# Good - includes searchable terms
key,value,text
uk,uk,United Kingdom (UK/Britain/England)
uae,uae,United Arab Emirates (UAE/Dubai)

# Less optimal - limited search terms
key,value,text
uk,uk,United Kingdom
uae,uae,United Arab Emirates
```

### 2. Consistent Key Patterns
```csv
# Good - consistent format
nyc-airport,nyc-airport,New York City Airports
lax-airport,lax-airport,Los Angeles Airport

# Avoid - inconsistent format
NYC_AIRPORT,NYC_AIRPORT,New York City Airports
lax-air,lax-air,Los Angeles Airport
```

### 3. Parent References
```csv
# Good - uses exact parent keys
key,value,text,country
paris,paris,Paris,france
lyon,lyon,Lyon,france

# Bad - uses display names instead of keys
key,value,text,country
paris,paris,Paris,France  # Should be 'france' not 'France'
```

## Performance Tips

1. **Index frequently searched columns**: The backend indexes `key`, `value['text']`, and `value['value']`

2. **Limit result size**: The typeahead automatically limits to 20 results

3. **Use appropriate debouncing**: 
   - Fast APIs: 200-300ms
   - Slower APIs: 400-500ms

4. **Cache considerations**: Results are cached for 1 hour by default

## Testing Your Data

After uploading, test the typeahead functionality:

1. **Test search terms**:
   ```
   GET /api/v1/lookups/countries?search=uni&size=20
   ```
   Should return: United States, United Kingdom, United Arab Emirates

2. **Test parent filtering**:
   ```
   GET /api/v1/lookups/cities?parent_key=usa&search=new&size=20
   ```
   Should return: New York, New Orleans, etc.

3. **Test special characters**:
   - Apostrophes: "Côte d'Ivoire"
   - Accents: "São Paulo"
   - Hyphens: "Port-au-Prince"

## Migration from Existing Data

If you have existing lookup data without typeahead:

1. **Export current data**:
   ```sql
   SELECT key, value->>'value' as value, value->>'text' as text
   FROM namespace_lookups
   WHERE lookup_name = 'countries'
   ```

2. **Add searchable terms to text field**:
   ```csv
   key,value,text
   usa,usa,United States (USA/US/America)
   ```

3. **Re-upload with same lookup_name**

4. **Enable typeahead in survey JSON**

## Common Issues and Solutions

### Issue: No results appearing
**Solution**: Check that search parameter is being sent and is at least `typeaheadMinLength` characters

### Issue: Wrong items filtered in cascading dropdown
**Solution**: Ensure parent reference column uses exact key values, not display text

### Issue: Slow typeahead response
**Solution**: 
- Increase `typeaheadDebounceMs`
- Reduce dataset size
- Add database indexes

### Issue: Special characters not searchable
**Solution**: Backend automatically handles UTF-8. Ensure CSV is UTF-8 encoded.

## Example Upload Script

```python
import requests
import pandas as pd

# Prepare your data
data = pd.DataFrame({
    'key': ['usa', 'canada', 'mexico'],
    'value': ['usa', 'canada', 'mexico'],
    'text': ['United States', 'Canada', 'Mexico'],
    'continent': ['north-america', 'north-america', 'north-america']
})

# Save to CSV
data.to_csv('countries.csv', index=False)

# Upload via API
with open('countries.csv', 'rb') as f:
    response = requests.post(
        'http://localhost:8001/api/v1/operations/customers/{customer_hex}/namespaces/{namespace_slug}/lookups/upload-csv',
        files={'file': f},
        data={
            'lookup_name': 'countries',
            'lookup_type': 'list'
        }
    )
```

## Summary

The typeahead data format is identical to your regular lookup data format:
- **Required**: `key`, `value` columns
- **Optional**: `text` column for display
- **Flexible**: Any additional columns for filtering/metadata

No special data preparation is needed for typeahead - just enable it in your survey JSON and ensure your datasets have good searchable text!