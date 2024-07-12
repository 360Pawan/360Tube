import { Request, Response } from "express";
import mongoose, { isValidObjectId } from "mongoose";

import { ApiError } from "@/utils/ApiError";
import { ApiResponse } from "@/utils/ApiResponse";
import { User } from "@/models/user.model";
import { asyncHandler } from "@/utils/asyncHandler";
import { Subscription } from "@/models/subscription.model";

const toggleSubscription = asyncHandler(
  async (request: Request, response: Response) => {
    const { channelId } = request.params;

    if (!channelId?.trim() || !isValidObjectId(channelId?.trim())) {
      return response
        .status(400)
        .json(new ApiError(400, "😰 Channel id is not valid."));
    }

    const channel = await User.findById(channelId);

    if (!channel) {
      return response
        .status(404)
        .json(new ApiError(404, "😰 No channel found."));
    }

    const isAlreadySubscribed = await Subscription.findOne({
      subscriber: request.user._id,
      channel: channel._id,
    });

    if (!isAlreadySubscribed) {
      const subscribedDoc = await Subscription.create({
        subscriber: request.user._id,
        channel: channel._id,
      });

      if (!subscribedDoc) {
        return response
          .status(500)
          .json(
            new ApiError(500, "😰 Something went wrong while subscribing.")
          );
      }

      return response
        .status(200)
        .json(new ApiResponse(200, {}, "👍 Channel subscribed."));
    } else {
      const deleteDoc = await Subscription.deleteOne({
        _id: isAlreadySubscribed._id,
      });

      if (deleteDoc.deletedCount !== 1) {
        return response
          .status(500)
          .json(new ApiError(500, "😰 Error unsubscribing channel.."));
      }

      return response
        .status(200)
        .json(new ApiResponse(200, {}, "👍 Channel unsubscribed."));
    }
  }
);

const getUserChannelSubscribers = asyncHandler(
  async (request: Request, response: Response) => {
    const subscribers = await Subscription.aggregate([
      {
        $match: {
          channel: new mongoose.Types.ObjectId(request.user._id as string),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "subscriber",
          foreignField: "_id",
          as: "subscriber",
        },
      },
      {
        $unwind: "$subscriber",
      },
      {
        $project: {
          fullName: "$subscriber.fullName",
          username: "$subscriber.username",
          avatar: "$subscriber.avatar",
        },
      },
    ]);

    response
      .status(200)
      .json(
        new ApiResponse(
          200,
          subscribers,
          "👍 Subscriber  fetched successfully."
        )
      );
  }
);

const getSubscribedChannels = asyncHandler(async (request, response) => {
  const subscribedTo = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(request.user._id),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
      },
    },
    {
      $unwind: "$channel",
    },
    {
      $project: {
        fullName: "$channel.fullName",
        username: "$channel.username",
        avatar: "$channel.avatar",
        coverImage: "$channel.coverImage",
      },
    },
  ]);

  response
    .status(200)
    .json(
      new ApiResponse(
        200,
        subscribedTo,
        "👍 Subscribed channels fetched successfully."
      )
    );
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
