// All code written here will run only on the server
"use server"

import { revalidatePath } from "next/cache";
import Product from "../models/product.model";
import { connectToDB } from "../mongoose";
import { scrapeAmazonProduct } from "../scraper";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../utils";
import { connect } from "http2";

export async function scrapeAndStoreProduct(productURL: string){
    if(!productURL) 
        return;

        try {

            connectToDB();
            
            const scrapedProduct = await scrapeAmazonProduct(productURL);
            if(!scrapedProduct) 
                return;
            
            // Store the products and periodically scrape them checking for changes in price
            let product = scrapedProduct;
            const existingProduct = await Product.findOne({
                url: scrapedProduct.url
            })

            if (existingProduct){
                const updatedPriceHistory: any = [
                    ...existingProduct.priceHistory,
                    {price: scrapedProduct.currentPrice}
                ]

                product = {
                    ...scrapedProduct, 
                    priceHistory: updatedPriceHistory,
                    lowestPrice: getLowestPrice(updatedPriceHistory),
                    highestPrice: getHighestPrice(updatedPriceHistory),
                    averagePrice: getAveragePrice(updatedPriceHistory),
                }
            }

            const newProduct = await Product.findOneAndUpdate({
                url: scrapedProduct.url},
                product,
                {
                    upsert: true, new: true
                }

            );

            revalidatePath(`/products/${newProduct._id}`);
        } 
        catch (error: any) {
            throw new Error(`Failed to create/update product: ${error.message}`)
        }
}

export async function getProductById(productId: string){
    try {
        connectToDB();
        const product = await Product.findOne({_id: productId});
        
        // if product does not exist, leave the function
        if(!product) return null;

        return product;
    } 
    catch (error) {
        console.log(error)        
    }
}