// CRON Jobs - Periodically update the user regarding selected products by rescraping and notifying incase there is any desired change

import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import { getLowestPrice, getHighestPrice, getAveragePrice, getEmailNotifType } from "@/lib/utils";

import Product from "@/lib/models/product.model";
import { scrapeAmazonProduct } from "@/lib/scraper";
import { generateEmailBody, sendEmail } from "@/lib/nodemailer";

export const maxDuration = 300; // This function can run for a maximum of 300 seconds
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET Request 
export async function GET(request: Request) {
  try {
    connectToDB();

    // Find all the products 
    const products = await Product.find({});

    // If there are no products, throw an error saying that there are no products found
    if (!products) throw new Error("No products found.");

    // Call multiple asynchronous actions simultaneously 
    const updatedProducts = await Promise.all(
      products.map(async (currentProduct: any) => {
        
        // Call function to scrape the product 
        const scrapedProduct = await scrapeAmazonProduct(currentProduct.url);

        // If there is no scraped product, exit 
        if (!scrapedProduct) return;

        // Add the current price of the product to the Price History of that product 
        const updatedPriceHistory = [
          ...currentProduct.priceHistory,
          {
            price: scrapedProduct.currentPrice,
          },
        ];

        const product = {
          ...scrapedProduct,
          priceHistory: updatedPriceHistory,
          lowestPrice: getLowestPrice(updatedPriceHistory),
          highestPrice: getHighestPrice(updatedPriceHistory),
          averagePrice: getAveragePrice(updatedPriceHistory),
        };

        // Update Products in the database 
        const updatedProduct = await Product.findOneAndUpdate(
          {
            url: product.url,
          },
          product,
        );

        // Check the status of each product and send the corresponding email to the user 
        const emailNotifType = getEmailNotifType(scrapedProduct, currentProduct);

        // Check if there is a user to update with the recent information
        if (emailNotifType && updatedProduct.users.length > 0) {
          const productInfo = {
            title: updatedProduct.title,
            url: updatedProduct.url,
          };
          // Build the email content 
          const emailContent = await generateEmailBody(productInfo, emailNotifType);
          // Get array of user emailIDs to which we need to send emails to 
          const userEmails = updatedProduct.users.map((user: any) => user.email);
          // Email notification sent
          await sendEmail(emailContent, userEmails);
        }

        return updatedProduct;
      })
    );

    return NextResponse.json({
      message: "Ok",
      data: updatedProducts,
    });
  } catch (error: any) {
    throw new Error(`ERROR in GET Request: ${error.message}`);
  }
}