"""
Import scripts for survey platform lookup data
Handles ZipToMarket and HospitalList data files
"""

import csv
import json
from uuid import uuid4
from datetime import datetime
from typing import List, Dict, Any
import asyncio
import asyncpg

# Database connection settings
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/survey_platform"

class LookupImporter:
    def __init__(self, tenant_id: str):
        self.tenant_id = tenant_id
        self.lookups = []
        
    async def import_zip_to_market(self, filepath: str):
        """
        Import ZIP to Market mappings.
        Data format: market_code,zip_code
        
        Stats from your data:
        - 233,202 total mappings
        - 1,519 unique market codes
        - Some markets have 6,000+ ZIP codes
        """
        print(f"Importing ZIP to Market data from {filepath}")
        
        # Track unique markets for creating parent lookups
        markets = set()
        zip_lookups = []
        
        with open(filepath, 'r') as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) >= 2:
                    market_code = row[0].strip()
                    zip_code = row[1].strip()
                    
                    markets.add(market_code)
                    
                    # Create ZIP code lookup with market as parent
                    zip_lookups.append({
                        "namespace": "zip-codes",
                        "key": zip_code,
                        "value": {
                            "value": zip_code,
                            "text": f"ZIP {zip_code}"
                        },
                        "parent_key": market_code,
                        "metadata": {
                            "market_code": market_code,
                            "type": "zip_code"
                        }
                    })
        
        # Create market area lookups (parents)
        market_lookups = []
        for market in sorted(markets):
            market_lookups.append({
                "namespace": "market-areas",
                "key": market,
                "value": {
                    "value": market,
                    "text": f"Market {market}"  # You might want to add proper names
                },
                "parent_key": None,
                "metadata": {
                    "type": "market_area"
                }
            })
        
        print(f"Found {len(markets)} unique markets and {len(zip_lookups)} ZIP mappings")
        
        self.lookups.extend(market_lookups)
        self.lookups.extend(zip_lookups)
        
        return {
            "markets": len(market_lookups),
            "zips": len(zip_lookups)
        }
    
    async def import_hospital_list(self, filepath: str):
        """
        Import hospital data.
        Data format: "code",, "name - location"
        
        Stats from your data:
        - 7,581 hospitals
        """
        print(f"Importing hospital data from {filepath}")
        
        hospital_lookups = []
        
        with open(filepath, 'r') as f:
            reader = csv.reader(f)
            for row in reader:
                if len(row) >= 3:
                    hospital_code = row[0].strip('"')
                    # Column 1 appears empty in the data
                    hospital_name = row[2].strip('"')
                    
                    # Parse name and location
                    # Format appears to be: "Hospital Name - City, State"
                    parts = hospital_name.split(' - ')
                    name = parts[0] if parts else hospital_name
                    location = parts[1] if len(parts) > 1 else ""
                    
                    hospital_lookups.append({
                        "namespace": "hospitals",
                        "key": hospital_code,
                        "value": {
                            "value": hospital_code,
                            "text": hospital_name
                        },
                        "parent_key": None,  # Could link to market if you have that mapping
                        "metadata": {
                            "type": "hospital",
                            "name": name,
                            "location": location
                        }
                    })
        
        print(f"Found {len(hospital_lookups)} hospitals")
        
        self.lookups.extend(hospital_lookups)
        
        return {
            "hospitals": len(hospital_lookups)
        }
    
    async def import_hospital_systems(self, filepath: str):
        """
        Import hospital system data.
        Data format: System Name - Location<TAB>SystemCode
        
        Stats from your data:
        - 1,151 hospital systems
        - Includes special entries like "No preference" with code -1
        """
        print(f"Importing hospital system data from {filepath}")
        
        system_lookups = []
        
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line:
                    # Split by tab
                    parts = line.split('\t')
                    if len(parts) >= 2:
                        system_name = parts[0].strip()
                        system_code = parts[1].strip()
                        
                        # Parse name and location if present
                        name_parts = system_name.split(' - ')
                        name = name_parts[0] if name_parts else system_name
                        location = name_parts[1] if len(name_parts) > 1 else ""
                        
                        system_lookups.append({
                            "namespace": "hospital-systems",
                            "key": system_code,
                            "value": {
                                "value": system_code,
                                "text": system_name
                            },
                            "parent_key": None,
                            "metadata": {
                                "type": "hospital_system",
                                "name": name,
                                "location": location,
                                "is_special": system_code == "-1"  # Flag special entries
                            }
                        })
        
        print(f"Found {len(system_lookups)} hospital systems")
        
        self.lookups.extend(system_lookups)
        
        return {
            "hospital_systems": len(system_lookups)
        }
    
    async def save_to_database(self):
        """
        Save lookups to PostgreSQL using batch inserts.
        Uses JSONB columns as designed in the architecture.
        """
        if not self.lookups:
            print("No lookups to save")
            return
        
        conn = await asyncpg.connect(DATABASE_URL)
        
        try:
            # Prepare batch insert
            records = []
            for lookup in self.lookups:
                records.append((
                    uuid4(),  # id
                    self.tenant_id,  # tenant_id
                    lookup["namespace"],
                    lookup["key"],
                    json.dumps(lookup["value"]),  # JSONB needs JSON string
                    1,  # version
                    lookup.get("parent_key"),
                    json.dumps(lookup.get("metadata", {})),
                    datetime.utcnow(),  # created_at
                    datetime.utcnow(),  # updated_at
                    None  # deleted_at
                ))
            
            # Batch insert using COPY for performance
            await conn.copy_records_to_table(
                'lookups',
                records=records,
                columns=['id', 'tenant_id', 'namespace', 'key', 'value', 
                        'version', 'parent_key', 'metadata', 
                        'created_at', 'updated_at', 'deleted_at']
            )
            
            print(f"Successfully saved {len(records)} lookups to database")
            
        finally:
            await conn.close()
    
    async def save_to_json(self, filepath: str):
        """
        Save lookups to JSON file for review or backup.
        """
        with open(filepath, 'w') as f:
            json.dump(self.lookups, f, indent=2, default=str)
        
        print(f"Saved {len(self.lookups)} lookups to {filepath}")

async def main():
    """
    Main import function
    """
    # Use a test tenant ID - replace with actual
    tenant_id = "00000000-0000-0000-0000-000000000001"
    
    importer = LookupImporter(tenant_id)
    
    # Import Hospital Systems data
    system_stats = await importer.import_hospital_systems(
        "/Users/paddyodabb/Downloads/soclaudecodecananalyzesampledata/HospSystemList.dat"
    )
    print(f"Hospital system import stats: {system_stats}")
    
    # Import Hospital data
    hospital_stats = await importer.import_hospital_list(
        "/Users/paddyodabb/Downloads/soclaudecodecananalyzesampledata/HospitalList.dat"
    )
    print(f"Hospital import stats: {hospital_stats}")
    
    # Import ZIP to Market data
    zip_stats = await importer.import_zip_to_market(
        "/Users/paddyodabb/Downloads/soclaudecodecananalyzesampledata/ZipToMarket.dat"
    )
    print(f"ZIP import stats: {zip_stats}")
    
    # Save to JSON for review
    await importer.save_to_json("lookups_export.json")
    
    # Uncomment to save to database
    # await importer.save_to_database()
    
    print(f"\nTotal lookups prepared: {len(importer.lookups)}")
    
    # Print summary by namespace
    namespace_counts = {}
    for lookup in importer.lookups:
        ns = lookup["namespace"]
        namespace_counts[ns] = namespace_counts.get(ns, 0) + 1
    
    print("\nLookups by namespace:")
    for ns, count in namespace_counts.items():
        print(f"  {ns}: {count:,}")

if __name__ == "__main__":
    asyncio.run(main())

"""
Performance Optimization Notes:

1. For 233K+ records, batch processing is critical
2. Using asyncpg's copy_records_to_table for bulk inserts
3. Consider chunking if memory is limited:
   - Process in batches of 10,000 records
   - Use streaming for very large files

4. Index Strategy for this data:
   - idx_tenant_namespace for listing all items in a namespace
   - idx_tenant_namespace_key for specific lookups
   - idx_tenant_namespace_parent for hierarchical queries (ZIP by market)

5. For the hierarchical ZIP/Market relationship:
   - ZIPs use parent_key to reference their market
   - Enables efficient "get all ZIPs for market X" queries
   - SurveyJS can use: /api/v1/lookups/zip-codes?parent_key={market_area}

6. Caching Strategy:
   - Market areas: Cache for 24 hours (rarely change)
   - ZIP codes by market: Cache for 24 hours
   - Hospitals: Cache for 24 hours
   - Individual lookups: Cache for 1 hour

7. API Usage Examples:
   # Get all markets
   GET /api/v1/lookups/market-areas
   
   # Get ZIPs for market "110"
   GET /api/v1/lookups/zip-codes?parent_key=110
   
   # Search hospitals
   GET /api/v1/lookups/hospitals?search=Memorial
   
   # Get specific hospital
   GET /api/v1/lookups/hospitals/1005
"""