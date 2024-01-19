import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath, folderName) => {
  try {
    if (!localFilePath) {
      console.log(`\n 😰 No local file path found.`);
      return null;
    }

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
      folder: folderName,
    });

    fs.unlinkSync(localFilePath);

    return response;
  } catch (error) {
    console.log(`\n 😰 Error uploading to cloudinary. ${error}`);

    fs.unlinkSync(localFilePath);
    return null;
  }
};

const removeFromCloudinary = async (publicId, resource_type) => {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resource_type,
    });
  } catch (error) {
    console.log(`\n 😰 Error removing from cloudinary. ${error}`);
  }
};

export { uploadOnCloudinary, removeFromCloudinary };
