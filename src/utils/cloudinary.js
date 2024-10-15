import { v2 as cloudinary } from 'cloudinary';
import fs from "fs";

// Configuration
cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET 
});

const uploadOnCloudinary = async (path) => {
    try {
        if(!path) return null 
        //upload file on cloudinary
        const response = await cloudinary.uploader.upload(path, {
            resource_type:"auto"
        })
        //file has been uploaded succesfully
        //console.log("file has been uploaded succesfully", response.url)
        fs.unlinkSync(path)
        return response
    } catch (error) {
        fs.unlinkSync(path) // remove the locally aved temporary file 
        return null
    }
}

const deleteFileOnCloudinary = async (path) => {
    try {
      const result = await cloudinary.uploader.destroy(path);
      console.log('Image deleted:', result);
      return result
    } catch (error) {
      console.error('Error deleting image:', error);
      return null
    }
  };
export {uploadOnCloudinary, deleteFileOnCloudinary} 
    
   /*  // Upload an image
     const uploadResult = await cloudinary.uploader
       .upload(
           'https://res.cloudinary.com/demo/image/upload/getting-started/shoes.jpg', {
               public_id: 'shoes',
           }
       )
       .catch((error) => {
           console.log(error);
       });
    
    console.log(uploadResult);
    
    // Optimize delivery by resizing and applying auto-format and auto-quality
    const optimizeUrl = cloudinary.url('shoes', {
        fetch_format: 'auto',
        quality: 'auto'
    });
    
    console.log(optimizeUrl);
    
    // Transform the image: auto-crop to square aspect_ratio
    const autoCropUrl = cloudinary.url('shoes', {
        crop: 'auto',
        gravity: 'auto',
        width: 500,
        height: 500,
    });
    
    console.log(autoCropUrl);     */

