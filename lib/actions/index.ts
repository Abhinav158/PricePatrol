// All code written here will run only on the server
"use server"

import { revalidatePath } from "next/cache";
import Product from "../models/product.model";
import { connectToDB } from "../mongoose";
import { scrapeAmazonProduct } from "../scraper";
import { getAveragePrice, getHighestPrice, getLowestPrice } from "../utils";
import { connect } from "http2";
import { User } from "@/types";
import ProductDetails from "@/app/products/[id]/page";
import { generateEmailBody, sendEmail } from "../nodemailer";

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

export async function getAllProducts(){
    try {
        connectToDB();

        const products = await Product.find();
        return products
    } catch (error) {
        console.log(error);
                
    }
}

export async function addUserEmailToProduct(productId: string, userEmail: string) {
    try {
      const product = await Product.findById(productId);
  
      if(!product) return;
  
      const userExists = product.users.some((user: User) => user.email === userEmail);
  
      if(!userExists) {
        product.users.push({ email: userEmail });
  
        await product.save();
  
        const emailContent = await generateEmailBody(product, "WELCOME");
  
        await sendEmail(emailContent, [userEmail]);
      }
    } catch (error) {
      console.log(error);
    }
}

