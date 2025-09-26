#!/usr/bin/env python3
import pandas as pd
import os

# Get the directory of this script
script_dir = os.path.dirname(os.path.abspath(__file__))

# Transform countries.csv
countries = pd.read_csv(os.path.join(script_dir, 'countries.csv'))
countries_transformed = pd.DataFrame({
    'key': countries['code'].str.lower(),
    'value': countries['code'].str.lower(),
    'text': countries['name'],
    'region': countries['region'].str.lower().str.replace(' ', '-')
})
countries_transformed.to_csv(os.path.join(script_dir, 'countries_upload.csv'), index=False)
print("✓ Created countries_upload.csv")

# Transform cities.csv
cities = pd.read_csv(os.path.join(script_dir, 'cities.csv'))
cities_transformed = pd.DataFrame({
    'key': cities['id'].str.lower(),
    'value': cities['id'].str.lower(),
    'text': cities['name_with_country'],
    'country': cities['country_code'].str.lower(),
    'population': cities['population']
})
cities_transformed.to_csv(os.path.join(script_dir, 'cities_upload.csv'), index=False)
print("✓ Created cities_upload.csv")

# Transform airports.csv
airports = pd.read_csv(os.path.join(script_dir, 'airports.csv'))
# Map country names to codes (simplified - you may need a full mapping)
country_map = {
    'United States': 'us',
    'China': 'cn',
    'United Arab Emirates': 'ae',
    'Japan': 'jp',
    'United Kingdom': 'gb',
    'France': 'fr',
    'Germany': 'de',
    'Spain': 'es',
    'Netherlands': 'nl',
    'Turkey': 'tr',
    'India': 'in',
    'Indonesia': 'id',
    'Canada': 'ca',
    'South Korea': 'kr',
    'Mexico': 'mx',
    'Thailand': 'th',
    'Malaysia': 'my',
    'Saudi Arabia': 'sa',
    'Australia': 'au',
    'Singapore': 'sg',
    'Italy': 'it',
    'Russia': 'ru',
    'Brazil': 'br',
    'Switzerland': 'ch',
    'Taiwan': 'tw'
}
airports_transformed = pd.DataFrame({
    'key': airports['code'].str.lower(),
    'value': airports['code'].str.lower(),
    'text': airports['name_with_code'],
    'city': airports['city'].str.lower().str.replace(' ', '-'),
    'country': airports['country'].map(country_map).fillna(airports['country'].str.lower().str.replace(' ', '-')),
    'iata_code': airports['code']
})
airports_transformed.to_csv(os.path.join(script_dir, 'airports_upload.csv'), index=False)
print("✓ Created airports_upload.csv")

# Transform airlines.csv
airlines = pd.read_csv(os.path.join(script_dir, 'airlines.csv'))
airlines_transformed = pd.DataFrame({
    'key': airlines['code'].str.lower(),
    'value': airlines['code'].str.lower(),
    'text': airlines['name'] + ' (' + airlines['code'] + ')',
    'country': airlines['country'].map(country_map).fillna(airlines['country'].str.lower().str.replace(' ', '-')),
    'alliance': airlines['alliance'].str.lower().str.replace(' ', '-'),
    'iata_code': airlines['code']
})
airlines_transformed.to_csv(os.path.join(script_dir, 'airlines_upload.csv'), index=False)
print("✓ Created airlines_upload.csv")

print("\n📤 Ready for upload! Use the *_upload.csv files")
print("\nUpload command example:")
print("POST /api/v1/operations/customers/{customer_hex}/namespaces/{namespace_slug}/lookups/upload-csv")
print("  - lookup_name: 'countries' (or 'cities', 'airports', 'airlines')")
print("  - lookup_type: 'list'")
print("  - file: countries_upload.csv")