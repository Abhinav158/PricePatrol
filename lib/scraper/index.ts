"use server"

import axios from 'axios';
import * as cheerio from 'cheerio';
import { extractCurrency, extractPrice, extractDescription } from '../utils';

export async function scrapeAmazonProduct(url: string) {
  if(!url) return;

  // BrightData proxy configuration
  const username = String(process.env.BRIGHT_DATA_USERNAME);
  const password = String(process.env.BRIGHT_DATA_PASSWORD);
  const port = 22225;
  const session_id = (1000000 * Math.random()) | 0;

  const options = {
    auth: {
      username: `${username}-session-${session_id}`,
      password,
    },
    host: 'brd.superproxy.io',
    port,
    rejectUnauthorized: false,
  }

  try {
    // Fetch the product page
    const response = await axios.get(url, options);
    const $ = cheerio.load(response.data);

    // Extract the product details like title, current price and original price 
    const title = $('#productTitle').text().trim();
    
    const currentPrice = extractPrice(
      $('.priceToPay span.a-price-whole'),
      $('.a.size.base.a-color-price'),
      $('.a-button-selected .a-color-base'),
    );

    const originalPrice = extractPrice(
      $('#priceblock_ourprice'),
      $('.a-price.a-text-price span.a-offscreen'),
      $('#listPrice'),
      $('#priceblock_dealprice'),
      $('.a-size-base.a-color-price')
    );
    
    // Check if the product is out of stock 
    const outOfStock = $('#availability span').text().trim().toLowerCase() === 'currently unavailable';
    
    // Grab the images of the product - NOTE: Not all products might have their corresponding images
    const images = 
      $('#imgBlkFront').attr('data-a-dynamic-image') || 
      $('#landingImage').attr('data-a-dynamic-image') ||
      '{}'

    const imageUrls = Object.keys(JSON.parse(images));

    const currency = extractCurrency($('.a-price-symbol'))

    // Check for discount rates applied on the product 
    const discountRate = $('.savingsPercentage').text().replace(/[-%]/g, "");

    // Description of the product 
    const description = extractDescription($)

    // Data object with scraped information
    const data = {
      url,
      currency: currency,
      image: imageUrls[0],
      title,
      description,
      currentPrice: Number(currentPrice) || Number(originalPrice),
      originalPrice: Number(originalPrice) || Number(currentPrice),
      priceHistory: [],
      discountRate: Number(discountRate),
      isOutOfStock: outOfStock,
      category: 'Category',
      reviewsCount: 30,
      stars: 4.2,
      lowestPrice: Number(currentPrice) || Number(originalPrice),
      highestPrice: Number(originalPrice) || Number(currentPrice),
      averagePrice: Number(currentPrice) || Number(originalPrice),
    }

    return data;
  } 
  catch (error: any) {
    console.log(error);
  }
}