import mongoose, { isValidObjectId } from "mongoose";

import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Comment } from "../models/comment.model.js";
import { Tweet } from "../models/tweet.model.js";

const toggleVideoLike = asyncHandler(async (request, response) => {
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

  const likedVideo = await Like.findOne({
    $and: [{ video: videoId }, { likedBy: request.user._id }],
  });

  if (!likedVideo) {
    const like = await Like.create({
      video: videoId,
      likedBy: request.user._id,
    });

    if (!like) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error while like."));
    }

    return response
      .status(200)
      .json(new ApiResponse(200, {}, "👍 Video liked successfully."));
  } else {
    const removeLike = await Like.deleteOne({
      _id: likedVideo._id,
    });

    if (removeLike.deletedCount === 0) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error while like."));
    }

    return response
      .status(200)
      .json(new ApiResponse(200, {}, "👍 Video like removed successfully."));
  }
});

const toggleCommentLike = asyncHandler(async (request, response) => {
  const { commentId } = request.params;

  if (!commentId || !isValidObjectId(commentId)) {
    return response
      .status(400)
      .json(new ApiError(400, "😰 Not a valid video id."));
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    return response.status(404).json(new ApiError(404, "😰 No comment found"));
  }

  const likedComment = await Like.findOne({
    $and: [{ comment: commentId }, { likedBy: request.user._id }],
  });

  if (!likedComment) {
    const like = await Like.create({
      comment: commentId,
      likedBy: request.user._id,
    });

    if (!like) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error while like."));
    }

    return response
      .status(200)
      .json(new ApiResponse(200, {}, "👍 Comment liked successfully."));
  } else {
    const removeLike = await Like.deleteOne({
      _id: likedComment._id,
    });

    if (removeLike.deletedCount === 0) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error while like."));
    }

    return response
      .status(200)
      .json(new ApiResponse(200, {}, "👍 Comment like removed successfully."));
  }
});

const toggleTweetLike = asyncHandler(async (request, response) => {
  const { tweetId } = request.params;

  if (!tweetId || !isValidObjectId(tweetId)) {
    return response
      .status(400)
      .json(new ApiError(400, "😰 Not a valid tweet id."));
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    return response.status(404).json(new ApiError(404, "😰 No tweet found"));
  }

  const likedTweet = await Like.findOne({
    $and: [{ tweet: tweetId }, { likedBy: request.user._id }],
  });

  if (!likedTweet) {
    const like = await Like.create({
      tweet: tweetId,
      likedBy: request.user._id,
    });

    if (!like) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error while like."));
    }

    return response
      .status(200)
      .json(new ApiResponse(200, {}, "👍 Tweet liked successfully."));
  } else {
    const removeLike = await Like.deleteOne({
      _id: likedTweet._id,
    });

    if (removeLike.deletedCount === 0) {
      return response
        .status(500)
        .json(new ApiError(500, "😰 Error while like."));
    }

    return response
      .status(200)
      .json(new ApiResponse(200, {}, "👍 Tweet like removed successfully."));
  }
});

const getLikedVideos = asyncHandler(async (request, response) => {
  const likedVideos = await Like.aggregate([
    {
      $match: {
        $and: [
          { likedBy: new mongoose.Types.ObjectId(request.user._id) },
          { video: { $exists: true } },
        ],
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
        pipeline: [
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
          {
            $unwind: "$owner",
          },
        ],
      },
    },
    {
      $unwind: "$video",
    },
    {
      $project: {
        video: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    },
  ]);

  if (likedVideos.length < 1) {
    return response.status(404).json(new ApiError(404, "😰 No video found"));
  }

  return response
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "👍 Liked videos fetched successfully.")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
