import os
import cloudinary
import cloudinary.uploader
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# --- Configuration ---
# This script assumes your backend and frontend folders are in the same parent directory.
# everaura-project/
#  |- backend/
#  |- frontend/
FRONTEND_IMAGE_PATH_BASE = os.path.join(os.path.dirname(__file__), '..', 'frontend')

# Cloudinary and MongoDB Config
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET")
)
client = MongoClient(os.getenv("MONGO_URI"))
db = client.everaura_db
products_collection = db.products

def upload_and_update():
    print("Starting image migration to Cloudinary...")

    for product in products_collection.find():
        # The old field might be 'image' (string) or 'images' (array)
        image_paths = product.get("images") or [product.get("image")]

        if not image_paths or not image_paths[0] or "cloudinary" in image_paths[0]:
            print(f"Skipping '{product['name']}' (already has cloud URL or no image path).")
            continue

        new_image_urls = []
        for local_path in image_paths:
            # Construct the full local file path from the relative path
            # e.g., "assets/images/products/ring1.jpg"
            full_path = os.path.join(FRONTEND_IMAGE_PATH_BASE, local_path)

            if os.path.exists(full_path):
                try:
                    print(f"Uploading {os.path.basename(full_path)} for '{product['name']}'...")
                    # Upload to Cloudinary into a specific folder for organization
                    upload_result = cloudinary.uploader.upload(full_path, folder="everaura_products")
                    secure_url = upload_result.get("secure_url")

                    if secure_url:
                        new_image_urls.append(secure_url)

                except Exception as e:
                    print(f"  ❌ FAILED to upload {os.path.basename(full_path)}. Error: {e}")
            else:
                print(f"  ⚠️ WARNING: Image file not found at path: {full_path}")

        if new_image_urls:
            # Update the database record with the new array of Cloudinary URLs
            products_collection.update_one(
                {"_id": product["_id"]},
                {
                    "$set": {"images": new_image_urls}, # The field is now 'images'
                    "$unset": {"image": ""} # Remove the old 'image' field if it exists
                }
            )
            print(f"  ✅ Success! Updated '{product['name']}' with new cloud URL(s).")


    print("\nMigration process complete.")
    client.close()

if __name__ == "__main__":
    upload_and_update()
