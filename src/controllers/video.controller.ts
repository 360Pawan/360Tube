import { Request, Response } from "express";
import mongoose, { isValidObjectId } from "mongoose";

import { Video } from "@/models/video.model";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";
import { removeFromCloudinary, uploadOnCloudinary } from "@/utils/cloudinary";

const publishAVideo = asyncHandler(
  async (request: Request, response: Response) => {
    const { title, description } = request.body;

    if ([title, description].some((field) => !field)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 All fields are required."));
    }

    let videoFileLocalPath: string, thumbnailLocalPath: string;

    if (
      request.files &&
      Array.isArray(request.files.videoFile) &&
      request.files.videoFile[0].path &&
      Array.isArray(request.files.thumbnail) &&
      request.files.thumbnail[0].path
    ) {
      videoFileLocalPath = request.files.videoFile[0].path;
      thumbnailLocalPath = request.files.thumbnail[0].path;
    } else {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Video file and thumbnail are required."));
    }

    const videoFile = await uploadOnCloudinary(
      videoFileLocalPath,
      "/videos/files"
    );
    const thumbnail = await uploadOnCloudinary(
      thumbnailLocalPath,
      "/videos/thumbnails"
    );

    if (!videoFile?.url || !thumbnail?.url) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error uploading video and thumbnail."));
    }

    const video = await Video.create({
      videoFile: { url: videoFile.url, publicId: videoFile.public_id },
      thumbnail: { url: thumbnail.url, publicId: thumbnail.public_id },
      duration: videoFile.duration,
      owner: request.user._id,
      title,
      description,
    });

    if (!video) {
      return response
        .status(500)
        .json(
          new ApiError(500, "😰 Something went wrong while uploading video.")
        );
    }

    response
      .status(201)
      .json(new ApiResponse(201, video, "👍 Video Uploaded successfully."));
  }
);

const getAllVideos = asyncHandler(
  async (request: Request, response: Response) => {
    const {
      page = 1,
      limit = 10,
      query,
      sortBy = "createdAt",
      sortType = -1,
      userId,
    } = request.query;

    const pipeline = [];

    if (userId && !isValidObjectId(userId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid object id."));
    }

    if (userId && isValidObjectId(userId)) {
      pipeline.push({
        $match: {
          owner: new mongoose.Types.ObjectId(userId as string),
        },
      });
    }

    if (query) {
      pipeline.push({
        $match: {
          $or: [
            { title: { $regex: new RegExp(query as string) } },
            { description: { $regex: new RegExp(query as string) } },
          ],
        },
      });
    }

    pipeline.push(
      {
        $sort: {
          [sortBy as string]: parseInt(sortType as string),
        },
      },
      { $skip: (parseInt(page as string) - 1) * parseInt(limit as string) },
      { $limit: parseInt(limit as string) },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$owner" }
    );

    const videos = await Video.aggregate(pipeline);

    if (videos.length < 1) {
      return response.status(404).json(new ApiError(404, "😰 No videos found"));
    }

    response
      .status(200)
      .json(new ApiResponse(200, videos, "👍 Videos fetched successfully."));
  }
);

const getVideoById = asyncHandler(
  async (request: Request, response: Response) => {
    const { videoId } = request.params;

    if (!videoId || !isValidObjectId(videoId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid video id."));
    }

    const video = await Video.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(videoId),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "owner",
          foreignField: "_id",
          as: "owner",
          pipeline: [
            {
              $project: {
                fullName: 1,
                username: 1,
                avatar: 1,
              },
            },
          ],
        },
      },
      { $unwind: "$owner" },
    ]);

    if (video.length < 1) {
      return response.status(404).json(new ApiError(404, "😰 No video found"));
    }

    response
      .status(200)
      .json(new ApiResponse(200, video[0], "👍 Video fetched successfully."));
  }
);

const updateVideo = asyncHandler(
  async (request: Request, response: Response) => {
    const { videoId } = request.params;
    const { title, description } = request.body;

    if (!videoId || !isValidObjectId(videoId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid video id."));
    }

    if ([title, description].some((field) => !field)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 All fields are required."));
    }

    const video = await Video.findById(videoId);

    if (!video) {
      return response.status(404).json(new ApiError(404, "😰 No video found"));
    }

    if (!video.owner.equals(request.user._id)) {
      return response
        .status(401)
        .json(new ApiError(401, "😰 You cannot update this video."));
    }

    video.title = title ?? video.title;
    video.description = description ?? video.description;

    const updatedVideo = await video.save();

    if (!updatedVideo) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error updating video."));
    }

    return response
      .status(200)
      .json(
        new ApiResponse(200, updatedVideo, "👍 Video updated successfully.")
      );
  }
);

const updateVideoThumbnail = asyncHandler(
  async (request: Request, response: Response) => {
    const { videoId } = request.params;

    if (!videoId || !isValidObjectId(videoId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid video id."));
    }

    if (!request.file || !request.file.path) {
      return response
        .status(400)
        .json(new ApiError(400, "😰Thumbnail is required."));
    }

    const video = await Video.findById(videoId);

    if (!video) {
      return response.status(404).json(new ApiError(404, "😰 No video found"));
    }

    if (!video.owner.equals(request.user._id)) {
      return response
        .status(401)
        .json(new ApiError(401, "😰 You cannot update this video."));
    }

    const thumbnail = await uploadOnCloudinary(
      request.file.path,
      "/videos/thumbnails"
    );
    await removeFromCloudinary(video.thumbnail.publicId, "image");

    if (!thumbnail?.url) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error uploading thumbnail."));
    }

    video.thumbnail = {
      url: thumbnail.url ?? video.thumbnail.url,
      publicId: thumbnail.public_id ?? video.thumbnail.publicId,
    };

    const updatedVideo = await video.save();

    if (!updatedVideo) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error updating thumbnail."));
    }

    return response
      .status(200)
      .json(
        new ApiResponse(200, updatedVideo, "👍 Video updated successfully.")
      );
  }
);

const deleteVideo = asyncHandler(
  async (request: Request, response: Response) => {
    const { videoId } = request.params;

    if (!videoId || !isValidObjectId(videoId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid video id."));
    }

    const video = await Video.findById(videoId);

    if (!video) {
      return response.status(404).json(new ApiError(404, "😰 No video found"));
    }

    if (!video.owner.equals(request.user._id)) {
      return response
        .status(401)
        .json(new ApiError(401, "😰 You cannot delete this video."));
    }

    await removeFromCloudinary(video.videoFile.publicId, "video");
    await removeFromCloudinary(video.thumbnail.publicId, "image");

    const deletedVideo = await Video.deleteOne({ _id: videoId });

    if (deletedVideo.deletedCount === 1) {
      return response
        .status(200)
        .json(new ApiResponse(200, {}, "👍 Video deleted successfully."));
    } else {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error deleting video."));
    }
  }
);

const togglePublishStatus = asyncHandler(
  async (request: Request, response: Response) => {
    const { videoId } = request.params;

    if (!videoId || !isValidObjectId(videoId)) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Not a valid video id."));
    }

    const video = await Video.findById(videoId);

    if (!video) {
      return response.status(404).json(new ApiError(404, "😰 No video found"));
    }

    if (!video.owner.equals(request.user._id)) {
      return response
        .status(401)
        .json(new ApiError(401, "😰 You cannot publish this video."));
    }

    video.isPublished = !video.isPublished;
    const updatedVideo = await video.save();

    if (!updatedVideo) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error publishing video."));
    }

    return response
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedVideo,
          `👍 Video ${updatedVideo.isPublished ? "published" : "unpublished"}.`
        )
      );
  }
);

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  updateVideoThumbnail,
  deleteVideo,
  togglePublishStatus,
};
