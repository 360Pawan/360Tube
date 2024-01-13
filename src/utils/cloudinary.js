import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) {
      console.log(`\n 😰 No local file path found.`);
      return null;
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      response_type: "auto",
    });

    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    console.log(`\n 😰 Error uploading cloudinary image. ${error}`);

    fs.unlinkSync(localFilePath);
    return null;
  }
};

export { uploadOnCloudinary };
