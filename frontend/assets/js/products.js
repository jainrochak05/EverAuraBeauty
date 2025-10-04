/**
 * @file products.js
 * @description This file contains the product data for the Everaura website.
 * It's an array of product objects, which acts as a simple database.
 *
 * Each product object has the following structure:
 * {
 * id: Number,              // Unique identifier for the product
 * name: String,            // Product name
 * image: String,           // Path to the product image
 * price: Number,           // Price of the product
 * isTrending: String,      // 'y' if it's a trending product
 * isBestSelling: String,   // 'y' if it's a best-selling product
 * type: String,            // 'modern' or 'classic'
 * category: String,        // Product category (e.g., 'Arings')
 * isAntiTarnish: String    // 'y' if it is anti-tarnish
 * }
 */

const products = [
    {
        id: 1,
        name: "Clover Themed Adjustable Finger Ring",
        image: "assets/images/products/ring1.jpg",
        price: 150.00,
        isTrending: '',
        isBestSelling: 'y',
        type: 'modern',
        category: 'Arings',
        isAntiTarnish: 'y'
    },
    {
        id: 2,
        name: "Contemporary Adjustable Finger Ring",
        image: "assets/images/products/ring2.jpg",
        price: 199.00,
        isTrending: '',
        isBestSelling: 'y',
        type: 'modern',
        category: 'Arings',
        isAntiTarnish: 'y'
    },
    {
        id: 3,
        name: "Heart Themed Layered Necklace",
        image: "assets/images/products/necklace1.jpg",
        price: 299.00,
        isTrending: 'y',
        isBestSelling: 'y',
        type: 'modern',
        category: 'Anecklace',
        isAntiTarnish: 'y'
    },
    {
        id: 4,
        name: "Black Geometric Pendant Necklace",
        image: "assets/images/products/necklace2.jpg",
        price: 255.00,
        isTrending: 'y',
        isBestSelling: 'y',
        type: 'modern',
        category: 'Anecklace',
        isAntiTarnish: 'y'
    },
    {
        id: 5,
        name: "White Emerald Layered Necklace",
        image: "assets/images/products/necklace3.jpg",
        price: 320.00,
        isTrending: 'y',
        isBestSelling: 'y',
        type: 'modern',
        category: 'Anecklace',
        isAntiTarnish: 'y'
    },
    {
        id: 6,
        name: "Pearl Studded Contemporary Pendant",
        image: "assets/images/products/necklace4.jpg",
        price: 269.00,
        isTrending: '',
        isBestSelling: 'y',
        type: 'modern',
        category: 'Anecklace',
        isAntiTarnish: 'y'
    },
    // ... all other products from your file go here, with corrected image paths.
    // I've included a few examples. Make sure to paste your full list.
    {
        id: 18,
        name: "Anti Tarnish Aurora Gold Tennis Bracelet",
        image: "assets/images/products/bracelet2.jpg",
        price: 300.00,
        isTrending: '',
        isBestSelling: 'y',
        type: 'modern',
        category: 'Abracelets',
        isAntiTarnish: 'y'
    },
    {
        id: 34,
        name: "Korean V-Pearl Luxe Earrings",
        image: "assets/images/products/earring18.jpg",
        price: 105.00,
        isTrending: '',
        isBestSelling: 'y',
        type: 'modern',
        category: 'Aearrings',
        isAntiTarnish: 'y'
    }
];
