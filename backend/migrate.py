import json
from pymongo import MongoClient
import os
from dotenv import load_dotenv

# Load the environment file
load_dotenv()

# Get the connection string from your .env file
CONNECTION_STRING = os.getenv("MONGO_URI")
DB_NAME = "everaura_db"
COLLECTION_NAME = "products"

def migrate_data():
    # Create a connection to MongoDB
    client = MongoClient(CONNECTION_STRING)
    db = client[DB_NAME]
    collection = db[COLLECTION_NAME]

    # Clear existing data to prevent duplicates on re-runs
    print("Clearing existing products from the database...")
    collection.delete_many({})

    # Read the local JSON file
    print("Reading products.json file...")
    try:
        with open('products.json', 'r', encoding='utf-8') as file:
            data = json.load(file)
    except FileNotFoundError:
        print("❌ ERROR: products.json not found. Make sure it's in the backend folder.")
        return

    # Insert the new data into the database
    if data:
        print(f"Inserting {len(data)} products into the database...")
        collection.insert_many(data)
        print("✅ Data migration successful!")
    else:
        print("❌ No data found in products.json file.")

    client.close()

if __name__ == "__main__":
    migrate_data()
