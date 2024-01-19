import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (request, response) => {
  const { content } = request.body;

  if (!content) {
    return response
      .status(400)
      .json(new ApiError(400, "😰 Content is required."));
  }

  const tweet = await Tweet.create({
    owner: request.user._id,
    content,
  });

  if (!tweet) {
    return response
      .status(500)
      .json(new ApiError(500, "😰 Error creating tweet."));
  }

  return response
    .status(201)
    .json(new ApiResponse(201, tweet, "👍 Tweet created."));
});

const getUserTweets = asyncHandler(async (request, response) => {
  const { userId } = request.params;

  if (!userId || !isValidObjectId(userId)) {
    return response
      .status(400)
      .json(new ApiError(400, "😰 Not a valid user id."));
  }

  const user = await User.findById(userId);

  if (!user) {
    return response.status(404).json(new ApiError(404, "😰 No user found."));
  }

  const tweets = await Tweet.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
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

  if (tweets.length < 1) {
    return response.status(404).json(new ApiError(404, "😰 No tweets found."));
  }

  return response
    .status(200)
    .json(new ApiResponse(200, tweets, "👍 Tweets fetched successfully."));
});

const updateTweet = asyncHandler(async (request, response) => {
  const { tweetId } = request.params;
  const { content } = request.body;

  if (!tweetId || !isValidObjectId(tweetId)) {
    return response
      .status(400)
      .json(new ApiError(400, "😰 Not a valid tweet id."));
  }

  if (!content) {
    return response
      .status(400)
      .json(new ApiError(400, "😰 Content is required."));
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    return response.status(404).json(new ApiError(404, "😰 No tweet found."));
  }

  if (!tweet.owner.equals(request.user._id)) {
    return response
      .status(401)
      .json(new ApiError(401, "😰 You cannot update this tweet."));
  }

  tweet.content = content;
  const updatedTweet = await tweet.save({ new: true });

  if (!updatedTweet) {
    return response
      .status(500)
      .json(new ApiError(500, "😰 Error updating tweet."));
  }

  return response
    .status(200)
    .json(new ApiResponse(200, tweet, "👍 Tweets updated successfully."));
});

const deleteTweet = asyncHandler(async (request, response) => {
  const { tweetId } = request.params;

  if (!tweetId || !isValidObjectId(tweetId)) {
    return response
      .status(400)
      .json(new ApiError(400, "😰 Not a valid tweet id."));
  }

  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    return response.status(404).json(new ApiError(404, "😰 No tweet found."));
  }

  if (!tweet.owner.equals(request.user._id)) {
    return response
      .status(401)
      .json(new ApiError(401, "😰 You cannot delete this video."));
  }

  const deletedTweet = await Tweet.deleteOne({ _id: tweetId });

  if (deletedTweet.deletedCount === 1) {
    return response
      .status(200)
      .json(new ApiResponse(200, {}, "👍 Tweet deleted successfully."));
  } else {
    return response
      .status(500)
      .json(new ApiError(500, "😰 Error deleting tweet."));
  }
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
