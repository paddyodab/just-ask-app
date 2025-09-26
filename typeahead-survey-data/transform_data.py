#!/usr/bin/env python3
import csv
import os

script_dir = os.path.dirname(os.path.abspath(__file__))

# Transform countries.csv
print("Transforming countries.csv...")
with open(os.path.join(script_dir, 'countries.csv'), 'r') as infile:
    with open(os.path.join(script_dir, 'countries_upload.csv'), 'w', newline='') as outfile:
        reader = csv.DictReader(infile)
        writer = csv.DictWriter(outfile, fieldnames=['key', 'value', 'text', 'region'])
        writer.writeheader()
        
        for row in reader:
            writer.writerow({
                'key': row['code'].lower(),
                'value': row['code'].lower(),
                'text': row['name'],
                'region': row['region'].lower().replace(' ', '-')
            })
print("✓ Created countries_upload.csv")

# Transform cities.csv
print("Transforming cities.csv...")
with open(os.path.join(script_dir, 'cities.csv'), 'r') as infile:
    with open(os.path.join(script_dir, 'cities_upload.csv'), 'w', newline='') as outfile:
        reader = csv.DictReader(infile)
        writer = csv.DictWriter(outfile, fieldnames=['key', 'value', 'text', 'country', 'population'])
        writer.writeheader()
        
        for row in reader:
            writer.writerow({
                'key': row['id'].lower(),
                'value': row['id'].lower(),
                'text': row['name_with_country'],
                'country': row['country_code'].lower(),
                'population': row['population']
            })
print("✓ Created cities_upload.csv")

# Transform airports.csv
print("Transforming airports.csv...")
# Simple country name to code mapping
country_to_code = {
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

with open(os.path.join(script_dir, 'airports.csv'), 'r') as infile:
    with open(os.path.join(script_dir, 'airports_upload.csv'), 'w', newline='') as outfile:
        reader = csv.DictReader(infile)
        writer = csv.DictWriter(outfile, fieldnames=['key', 'value', 'text', 'city', 'country', 'iata_code'])
        writer.writeheader()
        
        for row in reader:
            country_code = country_to_code.get(row['country'], row['country'].lower().replace(' ', '-'))
            writer.writerow({
                'key': row['code'].lower(),
                'value': row['code'].lower(),
                'text': row['name_with_code'],
                'city': row['city'].lower().replace(' ', '-'),
                'country': country_code,
                'iata_code': row['code']
            })
print("✓ Created airports_upload.csv")

# Transform airlines.csv
print("Transforming airlines.csv...")
with open(os.path.join(script_dir, 'airlines.csv'), 'r') as infile:
    with open(os.path.join(script_dir, 'airlines_upload.csv'), 'w', newline='') as outfile:
        reader = csv.DictReader(infile)
        writer = csv.DictWriter(outfile, fieldnames=['key', 'value', 'text', 'country', 'alliance', 'iata_code'])
        writer.writeheader()
        
        for row in reader:
            country_code = country_to_code.get(row['country'], row['country'].lower().replace(' ', '-'))
            writer.writerow({
                'key': row['code'].lower(),
                'value': row['code'].lower(),
                'text': f"{row['name']} ({row['code']})",
                'country': country_code,
                'alliance': row['alliance'].lower().replace(' ', '-'),
                'iata_code': row['code']
            })
print("✓ Created airlines_upload.csv")

print("\n📤 Ready for upload! Use the *_upload.csv files")
print("\nUpload examples:")
print("  - countries_upload.csv → lookup_name: 'countries'")
print("  - cities_upload.csv → lookup_name: 'cities'")
print("  - airports_upload.csv → lookup_name: 'airports'")
print("  - airlines_upload.csv → lookup_name: 'airlines'")