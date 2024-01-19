import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getChannelStats = asyncHandler(async (request, response) => {
  // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.

  const videoData = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(request.user._id),
      },
    },
    {
      $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "video",
        as: "likes",
      },
    },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$views" },
        totalVideoLikes: { $sum: { $size: "$likes" } },
      },
    },
    {
      $project: {
        _id: 0,
        totalVideos: "$totalVideos",
        totalViews: "$totalViews",
        totalVideoLikes: "$totalVideoLikes",
      },
    },
  ]);

  const subscribers = await Subscription.find({
    channel: new mongoose.Types.ObjectId(request.user._id),
  }).count();

  return response.status(200).json(
    new ApiResponse(
      200,
      {
        totalVideos: videoData[0]?.totalVideos ?? 0,
        totalViews: videoData[0]?.totalViews ?? 0,
        totalVideoLikes: videoData[0]?.totalVideoLikes ?? 0,
        subscribers: subscribers,
      },
      "👍 User Stats fetched successfully.."
    )
  );
});

const getChannelVideos = asyncHandler(async (request, response) => {
  const videos = await Video.find({
    owner: new mongoose.Types.ObjectId(request.user._id),
  });

  if (videos.length < 1) {
    return response.status(404).json(new ApiError(404, "😰 No video found"));
  }

  return response
    .status(200)
    .json(new ApiResponse(200, videos, "👍 All system fine."));
});

export { getChannelStats, getChannelVideos };
