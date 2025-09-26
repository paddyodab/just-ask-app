#!/bin/bash

# Transform countries.csv
echo "Transforming countries.csv..."
echo "key,value,text,region" > countries_upload.csv
tail -n +2 countries.csv | while IFS=',' read -r code name region; do
    key=$(echo "$code" | tr '[:upper:]' '[:lower:]')
    value="$key"
    text="$name"
    region_formatted=$(echo "$region" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    echo "$key,$value,$text,$region_formatted" >> countries_upload.csv
done

# Transform cities.csv  
echo "Transforming cities.csv..."
echo "key,value,text,country,population" > cities_upload.csv
tail -n +2 cities.csv | while IFS=',' read -r id name country_code name_with_country population; do
    key=$(echo "$id" | tr '[:upper:]' '[:lower:]')
    value="$key"
    text="$name_with_country"
    country=$(echo "$country_code" | tr '[:upper:]' '[:lower:]')
    echo "$key,$value,$text,$country,$population" >> cities_upload.csv
done

# Transform airports.csv (simplified - just first few fields)
echo "Transforming airports.csv..."
echo "key,value,text,city,iata_code" > airports_upload.csv
tail -n +2 airports.csv | while IFS=',' read -r code name city country name_with_code; do
    key=$(echo "$code" | tr '[:upper:]' '[:lower:]')
    value="$key"
    text="$name_with_code"
    city_formatted=$(echo "$city" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    echo "$key,$value,$text,$city_formatted,$code" >> airports_upload.csv
done

# Transform airlines.csv
echo "Transforming airlines.csv..."
echo "key,value,text,alliance,iata_code" > airlines_upload.csv
tail -n +2 airlines.csv | while IFS=',' read -r code name country alliance; do
    key=$(echo "$code" | tr '[:upper:]' '[:lower:]')
    value="$key"
    text="$name ($code)"
    alliance_formatted=$(echo "$alliance" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
    echo "$key,$value,$text,$alliance_formatted,$code" >> airlines_upload.csv
done

echo "✅ Transformation complete! Created:"
echo "  - countries_upload.csv"
echo "  - cities_upload.csv"
echo "  - airports_upload.csv"
echo "  - airlines_upload.csv"