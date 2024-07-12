import mongoose from "mongoose";
import { Request, Response } from "express";

import { Video } from "@/models/video.model";
import { Subscription } from "@/models/subscription.model";
import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { asyncHandler } from "@/utils/asyncHandler";

const getChannelStats = asyncHandler(
  async (request: Request, response: Response) => {
    const videoData = await Video.aggregate([
      {
        $match: {
          owner: new mongoose.Types.ObjectId(request.user._id as string),
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
      channel: new mongoose.Types.ObjectId(request.user._id as string),
    }).countDocuments();

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
  }
);

const getChannelVideos = asyncHandler(
  async (request: Request, response: Response) => {
    const videos = await Video.find({
      owner: new mongoose.Types.ObjectId(request.user._id as string),
    });

    if (videos.length < 1) {
      return response.status(404).json(new ApiError(404, "😰 No video found"));
    }

    return response
      .status(200)
      .json(new ApiResponse(200, videos, "👍 All system fine."));
  }
);

export { getChannelStats, getChannelVideos };
