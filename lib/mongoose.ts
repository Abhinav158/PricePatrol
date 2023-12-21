// IMPORTANT --> import mongoose from 'mongoose' didnt work - POTENTIAL ERROR - find out why
const mongoose = require('mongoose')


// Variable to track the connection status 
let isConnected = false

export const connectToDB = async() => {
    mongoose.set('strictQuery', true);

    if(!process.env.MONGODB_URI) 
        return console.log('MONGODB_URI is not defined.');
    
    // If we are already connected
    if(isConnected)
        return console.log("Using existing database connection...");
    
        // If we are not connected
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        isConnected = true
        console.log('MongoDB Connected');
        
            
    } catch (error) {
        console.log(error)
    }

    
}
