"use client"

import { scrapeAndStoreProduct } from "@/lib/actions";
import { FormEvent, useState } from "react"

const isValidProductURL = (url: string) => {
    try{
        const parsedURL = new URL(url);
        const hostname = parsedURL.hostname;

        // Check if hostname contains amazon followed by country code
        if (hostname.includes('amazon.') || hostname.endsWith('amazon')){
            return true
        }
    }
    catch(error){
        return false
    }
    
    return false
}

const Searchbar = () => {

  const [searchPrompt, setSearchPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Prevent default behaviour of the browser once the form is submitted
  // We do not want to reload the page after submitting the form

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Check validity of the URL entered by the user 
    const isValidLink = isValidProductURL(searchPrompt);
    
    if(!isValidLink){
        return alert('Please provide a valid Amazon product Link')
    }

    try {
        setIsLoading(true);

        // Scrape the product 
        const product = await scrapeAndStoreProduct(searchPrompt);


    } catch (error) {
        console.log(error);
    } finally{
        setIsLoading(false)
    }
  } 

  return (
    <form 
        action="" 
        className='flex flex-wrap gap-4 mt-12' 
        onSubmit={handleSubmit}
    >
        <input 
            type="text"
            value={searchPrompt}
            onChange={(e) => setSearchPrompt(e.target.value)} 
            placeholder='Enter Product Link'
            className="searchbar-input" 
        />
        <button type='submit' className="searchbar-btn">
            {
                isLoading ? 'Searching...' : 'Search'
            }                    
        </button>
    
    
    </form>
  )
}

export default Searchbar